import logging
from contextlib import asynccontextmanager, nullcontext
from dataclasses import dataclass, field
from typing import Annotated, Any, AsyncIterator

import httpx
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool, StructuredTool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from psycopg import OperationalError
from pydantic import BaseModel
from typing_extensions import TypedDict

from core.config import CONFIG

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# Read-only allowlist mirroring resume-agent/src/agent/mcp-tools.ts — the
# interview agent only needs to ground questions in the candidate's resume,
# never mutate it. Write tools stay behind the HITL approval flow.
READ_ONLY_MCP_TOOLS = {
    "get_candidate_profile",
    "get_profile_specs",
    "get_profile_spec",
}

PROPOSE_PROFILE_UPDATE_TOOL_NAME = "propose_profile_update"


class ProfileUpdateProposal(BaseModel):
    """Partial candidate profile fields to propose for human review.

    Mirrors api-server's PATCH /api/profile/:id body shape field-for-field.
    List fields are replaced wholesale by that endpoint (no item-level
    merge), so a proposal touching one entry must include the complete
    array, not just the changed item.
    """

    title: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    website: str | None = None
    skills: list[dict[str, Any]] | None = None
    projects: list[dict[str, Any]] | None = None
    experiences: list[dict[str, Any]] | None = None
    educations: list[dict[str, Any]] | None = None
    links: list[dict[str, Any]] | None = None


def _propose_profile_update(**kwargs: Any) -> dict[str, Any]:
    """Pure pass-through — no side effect.

    Persisting an approved proposal happens entirely outside ai-server, via
    api-server's existing authenticated PATCH /api/profile/:id, never here.
    """
    return {k: v for k, v in kwargs.items() if v is not None}


PROPOSE_PROFILE_UPDATE_TOOL = StructuredTool.from_function(
    func=_propose_profile_update,
    name=PROPOSE_PROFILE_UPDATE_TOOL_NAME,
    description=(
        "Propose candidate profile field changes for the candidate to review. "
        "This does NOT save anything — it only surfaces a diff for the "
        "candidate to approve or reject themselves. Include only the fields "
        "you are changing. For list fields (skills, projects, experiences, "
        "educations, links), first read the candidate's current profile, "
        "then return the COMPLETE array including every unchanged entry — "
        "these fields are replaced wholesale when saved, not merged."
    ),
    args_schema=ProfileUpdateProposal,
)

SYSTEM_PROMPT = (
    "You are an AI interviewer helping a candidate refine their resume during "
    "a technical interview conversation.\n\n"
    "You can read the candidate's profile with the available read-only tools. "
    "You have no ability to save, update, or persist any change to the "
    "candidate's profile — never claim to have done so.\n\n"
    "When you want to suggest an edit to the candidate's resume, call "
    f"{PROPOSE_PROFILE_UPDATE_TOOL_NAME} with only the fields you are "
    "changing. This shows the candidate a diff to approve or reject "
    "themselves; it never saves anything by itself. For list fields "
    "(skills, projects, experiences, educations, links), first read the "
    "candidate's current profile, then return the COMPLETE array including "
    "every unchanged entry — these fields are replaced wholesale when "
    "saved, not merged item by item."
)


@dataclass
class ProposalOutcome:
    proposal_id: str
    approved: bool


@dataclass
class AgentTurnResult:
    text: str
    proposals: list[dict[str, Any]] = field(default_factory=list)


def _messages_to_turns(messages: list[BaseMessage]) -> list[dict]:
    """Group a flat checkpoint message list into user/assistant turns.

    A turn starts at a HumanMessage and includes everything up to (but not
    including) the next HumanMessage — the AIMessage/ToolMessage pairs from
    the tool-calling loop collapse into one assistant response, using the
    last AIMessage's text as the turn's content and every
    propose_profile_update call across the span as its proposals.
    """
    turns: list[dict] = []
    current: dict | None = None

    for message in messages:
        if isinstance(message, HumanMessage):
            if current is not None:
                turns.append(current)
            current = {"user_message": message.text, "assistant_message": "", "proposals": []}
            continue

        if current is None:
            # Messages before the first HumanMessage shouldn't occur in
            # practice (SystemMessage is injected at call time, never stored).
            continue

        if isinstance(message, AIMessage):
            current["assistant_message"] = message.text
            for call in message.tool_calls:
                if call["name"] == PROPOSE_PROFILE_UPDATE_TOOL_NAME:
                    current["proposals"].append({"id": call["id"], "proposed_fields": call["args"]})

    if current is not None:
        turns.append(current)

    return turns


_checkpointer: AsyncPostgresSaver | None = None

# Opt-in and fail-open: without both keys configured, no Langfuse client is
# created and the agent runs exactly as it did before this integration.
# Imported lazily below so the (fairly heavy) langfuse package is never
# loaded at all on the common path where tracing is disabled.
_langfuse_client: Any | None = None
_langfuse_handler: Any | None = None

if CONFIG.LANGFUSE_ENABLED:
    from langfuse import Langfuse
    from langfuse.langchain import CallbackHandler

    _langfuse_client = Langfuse(
        public_key=CONFIG.LANGFUSE_PUBLIC_KEY,
        secret_key=CONFIG.LANGFUSE_SECRET_KEY,
        base_url=CONFIG.LANGFUSE_BASE_URL,
    )
    _langfuse_handler = CallbackHandler()
    logger.info("Langfuse tracing enabled (base_url=%s)", CONFIG.LANGFUSE_BASE_URL)
else:
    logger.info("Langfuse tracing disabled — LANGFUSE_PUBLIC_KEY/SECRET_KEY not set")


def shutdown_langfuse() -> None:
    """Flush buffered traces before the process exits. No-op when disabled."""
    if _langfuse_client is not None:
        _langfuse_client.shutdown()


async def _load_candidate_tools(candidate_id: str) -> list[BaseTool]:
    """Load the resume MCP tools scoped to one candidate.

    api-server's MCP transport is stateless (a fresh server per HTTP
    request), so there's no connection to keep open — a new client is built
    per invocation, matching resume-agent's mcp-tools.ts.
    """
    client = MultiServerMCPClient(
        {
            "resume-editor": {
                "transport": "streamable_http",
                "url": CONFIG.MCP_URL,
                "headers": {"x-candidate-id": candidate_id},
            }
        }
    )
    tools = await client.get_tools()
    scoped_tools = [tool for tool in tools if tool.name in READ_ONLY_MCP_TOOLS]
    logger.debug(
        "Loaded %d MCP tool(s) for candidate %s: %s",
        len(scoped_tools),
        candidate_id,
        [tool.name for tool in scoped_tools],
    )
    return scoped_tools


def _build_graph(checkpointer: AsyncPostgresSaver, tools: list[BaseTool]):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=CONFIG.GOOGLE_API_KEY,
    )
    # propose_profile_update is always bound, regardless of candidate_id/MCP
    # tool availability — it's local and side-effect-free, so the agent can
    # always at least propose an edit even if MCP tools fail to load. This
    # also guarantees the tools node is always present: no separate
    # tools/no-tools branch is needed.
    all_tools = [*tools, PROPOSE_PROFILE_UPDATE_TOOL]
    logger.debug("Building graph with tools: %s", [tool.name for tool in all_tools])
    llm_with_tools = llm.bind_tools(all_tools)

    async def call_model(state: AgentState) -> dict:
        messages = [SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

    builder = StateGraph(AgentState)
    builder.add_node("agent", call_model)
    builder.add_node("tools", ToolNode(all_tools))
    builder.set_entry_point("agent")
    builder.add_conditional_edges("agent", tools_condition)
    builder.add_edge("tools", "agent")

    return builder.compile(checkpointer=checkpointer)


@asynccontextmanager
async def lifespan_checkpointer() -> AsyncIterator[None]:
    """Open the AsyncPostgresSaver, create its checkpoint tables, then tear
    down on shutdown.  Intended to be called from FastAPI's lifespan.

    Connecting is not wrapped in retry/fallback logic — if the database is
    unreachable at startup, this raises and FastAPI's lifespan aborts, which
    fails the server rather than starting in a degraded state."""
    global _checkpointer
    try:
        async with AsyncPostgresSaver.from_conn_string(CONFIG.DATABASE_URL) as saver:
            await saver.setup()
            _checkpointer = saver
            yield
    except OperationalError as exc:
        raise RuntimeError(
            "Could not connect to the checkpointer database — refusing to start"
        ) from exc
    finally:
        _checkpointer = None


async def invoke_agent(
    thread_id: str,
    user_message: str | None = None,
    candidate_id: str | None = None,
    proposal_outcome: ProposalOutcome | None = None,
) -> AgentTurnResult:
    if _checkpointer is None:
        raise RuntimeError("Agent graph not initialised — lifespan not started")

    if user_message is None and proposal_outcome is None:
        raise ValueError("invoke_agent requires user_message or proposal_outcome")

    logger.info(
        "Invoking agent (thread_id=%s, candidate_id=%s, has_message=%s, proposal_id=%s)",
        thread_id,
        candidate_id,
        user_message is not None,
        proposal_outcome.proposal_id if proposal_outcome else None,
    )

    # Tools are scoped to the candidate via the x-candidate-id header, so the
    # graph is (cheaply) rebuilt per call rather than cached at startup.
    tools = await _load_candidate_tools(candidate_id) if candidate_id else []
    graph = _build_graph(_checkpointer, tools)

    config: dict = {"configurable": {"thread_id": thread_id}}
    trace_attributes = nullcontext()
    if _langfuse_handler is not None:
        from langfuse import propagate_attributes

        config["callbacks"] = [_langfuse_handler]
        attrs: dict = {"session_id": thread_id, "tags": ["ai-server"]}
        if candidate_id:
            attrs["user_id"] = candidate_id
        trace_attributes = propagate_attributes(**attrs)

    # proposal_outcome is reported as a synthetic, clearly-bracketed fact
    # rather than freeform text — it's a deterministic status update, not
    # something the model should interpret as the candidate's own words.
    if proposal_outcome is not None:
        status = (
            "approved — the change has already been saved to the candidate's profile"
            if proposal_outcome.approved
            else "rejected — no change was made"
        )
        input_message = HumanMessage(
            content=f"[proposal {proposal_outcome.proposal_id} {status}]"
        )
    else:
        input_message = HumanMessage(content=user_message)

    try:
        # Snapshot the message count before this turn so only tool calls
        # made *during* this invocation are surfaced as new proposals —
        # proposals from prior, already-resolved turns must not resurface.
        prior_state = await graph.aget_state(config)
        prior_message_count = (
            len(prior_state.values.get("messages", [])) if prior_state.values else 0
        )

        with trace_attributes:
            result = await graph.ainvoke(
                {"messages": [input_message]},
                config=config,
            )
    except Exception:
        logger.exception("Agent invocation failed (thread_id=%s)", thread_id)
        raise

    logger.info("Agent invocation complete (thread_id=%s)", thread_id)

    # The messages appended during this invocation are exactly one turn
    # (the input_message plus its tool-calling loop), so this always
    # collapses to at most one element.
    new_turns = _messages_to_turns(result["messages"][prior_message_count:])
    turn = new_turns[0] if new_turns else {"assistant_message": "", "proposals": []}

    # Gemini responses can return content as a list of parts (e.g. text +
    # thought-signature blocks) rather than a plain string; .text (used
    # inside _messages_to_turns) normalises both shapes to a string.
    return AgentTurnResult(
        text=turn["assistant_message"] or result["messages"][-1].text,
        proposals=turn["proposals"],
    )


async def get_thread_messages(thread_id: str) -> list[dict] | None:
    """Reconstruct a thread's turn history from the checkpointer.

    Returns None when no checkpoint exists for thread_id (unknown thread).
    Uses aget_tuple rather than graph.aget_state to avoid rebuilding the
    graph / loading MCP tools just to read history.
    """
    if _checkpointer is None:
        raise RuntimeError("Agent graph not initialised — lifespan not started")

    checkpoint_tuple = await _checkpointer.aget_tuple({"configurable": {"thread_id": thread_id}})
    if checkpoint_tuple is None:
        return None

    messages = checkpoint_tuple.checkpoint["channel_values"].get("messages", [])
    return _messages_to_turns(messages)


async def notify_thread_created(thread_id: str, candidate_id: str) -> None:
    """Best-effort webhook telling api-server about a newly minted thread.

    Fired as a FastAPI BackgroundTask after the /agent response is already
    sent to the client — must never block or fail the candidate's turn, so
    failures are logged and swallowed rather than raised.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CONFIG.API_SERVER_URL}/api/webhooks/conversation-threads",
                json={"thread_id": thread_id, "candidate_id": candidate_id},
            )
            response.raise_for_status()
    except Exception:
        logger.exception(
            "Failed to notify api-server of new thread (thread_id=%s, candidate_id=%s)",
            thread_id,
            candidate_id,
        )
