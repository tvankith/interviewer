import logging
import uuid
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from agent.graph import (
    ProposalOutcome,
    ProposalUnitDecision,
    get_thread_messages,
    invoke_agent,
    notify_thread_created,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class ProposalUnitDecisionRequest(BaseModel):
    unit: str
    status: Literal["accepted", "rejected"]


class ProposalOutcomeRequest(BaseModel):
    proposal_id: str
    decisions: list[ProposalUnitDecisionRequest]


class AgentRequest(BaseModel):
    candidate_id: str
    message: str | None = Field(default=None)
    session_id: str | None = Field(default=None)
    proposal_outcome: ProposalOutcomeRequest | None = Field(default=None)


class Proposal(BaseModel):
    id: str
    proposed_fields: dict


class AgentResponse(BaseModel):
    session_id: str
    result: str
    proposals: list[Proposal] = Field(default_factory=list)


class ThreadTurn(BaseModel):
    user_message: str
    assistant_message: str
    proposals: list[Proposal] = Field(default_factory=list)


class ThreadMessagesResponse(BaseModel):
    thread_id: str
    messages: list[ThreadTurn]


@router.post("/agent", response_model=AgentResponse)
async def agent(body: AgentRequest, background_tasks: BackgroundTasks) -> AgentResponse:
    session_id = body.session_id or str(uuid.uuid4())
    if body.message is None and body.proposal_outcome is None:
        raise HTTPException(
            status_code=400, detail="message or proposal_outcome is required"
        )
    try:
        turn_result = await invoke_agent(
            thread_id=session_id,
            user_message=body.message,
            candidate_id=body.candidate_id,
            proposal_outcome=(
                ProposalOutcome(
                    proposal_id=body.proposal_outcome.proposal_id,
                    decisions=[
                        ProposalUnitDecision(unit=d.unit, status=d.status)
                        for d in body.proposal_outcome.decisions
                    ],
                )
                if body.proposal_outcome
                else None
            ),
        )
    except Exception as exc:
        logger.exception("POST /agent failed (session_id=%s)", session_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Only a brand-new thread (no session_id on the request) needs to be
    # registered with api-server; scheduled after the response is built so
    # it never delays or fails the candidate's turn.
    if body.session_id is None:
        background_tasks.add_task(notify_thread_created, session_id, body.candidate_id)

    return AgentResponse(
        session_id=session_id,
        result=turn_result.text,
        proposals=[Proposal(**p) for p in turn_result.proposals],
    )


@router.get("/agent/threads/{thread_id}/messages", response_model=ThreadMessagesResponse)
async def thread_messages(thread_id: str) -> ThreadMessagesResponse:
    turns = await get_thread_messages(thread_id)
    if turns is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return ThreadMessagesResponse(
        thread_id=thread_id,
        messages=[ThreadTurn(**turn) for turn in turns],
    )
