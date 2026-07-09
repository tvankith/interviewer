## Context

`ai-server`'s interview agent (`ai-server/src/agent/graph.py`) runs `gemini-2.5-flash` in a standard
LangGraph `agent` ⇄ `tools` loop. Today its only tools are read-only MCP tools scoped to a candidate's profile
(`get_candidate_profile`, `get_profile_specs`, `get_profile_spec`) and the local, side-effect-free
`propose_profile_update` tool. The model drafts resume edits from its own parametric knowledge of "good resume
writing" with no grounding — quality varies because `gemini-2.5-flash` is intentionally the cheap/fast tier of
the model family.

This change adds a knowledge base of resume-writing guidance (phrasing patterns, quantification examples,
action-verb banks, common mistakes, section-specific conventions) retrievable via Qdrant Cloud (already
provisioned by the user — cluster + API key exist), embedded with a Gemini embedding model. Retrieval is
wired into the same LangGraph agent as one more bound tool, living inside `ai-server`. Ingestion is a fully
separate, standalone project at the repo root — a sibling to `app/`, `api-server/`, and `ai-server/`, not a
subpackage of any of them — manually triggered, never running on any request path.

## Goals / Non-Goals

**Goals:**
- Give the interview agent a `retrieve_resume_guidance` tool it can call before proposing resume edits, so
  `propose_profile_update` output is grounded in curated writing guidance rather than pure model recall.
- Keep ingestion (chunk → embed → upsert) fully decoupled from `ai-server`: its own top-level project at the
  repo root, with its own dependencies and environment, not merely its own subfolder — a manually-run tool, not
  a background job, webhook, or scheduled task.
- Reuse the same stack conventions already established for Python services in this repo (`uv`-managed,
  `.python-version`-pinned, matching `ai-server`'s pattern) without adding a new running container.

**Non-Goals:**
- Real-time/event-driven re-ingestion (e.g. reacting to profile edits) — explicitly deferred; this phase is
  batch/manual only.
- Retrieval over candidate resumes/profiles or job descriptions — out of scope for this change; the knowledge
  base is exclusively resume-writing guidance content (guides, examples, rules), not candidate data.
- Building or curating the actual guidance corpus content — this change delivers the pipeline and tooling;
  populating `ingestion/corpus/` with real guidance documents is a follow-up content task.
- A UI or API endpoint for triggering ingestion — it's invoked as a local CLI command by whoever maintains the
  corpus.
- Code sharing between `ingestion` and `ai-server` — see Decision 1. A small amount of near-identical
  embedding/Qdrant-client glue is deliberately duplicated rather than factored into a shared library, to keep
  the two projects fully independent.

## Decisions

### 1. `ingestion/` as a new top-level project at the repo root, fully independent of `ai-server`

Ingestion and retrieval have different lifecycles (one-off CLI run vs. per-request tool call), different
dependents (a maintainer's terminal vs. the LangGraph agent), and per explicit direction must not live inside
`ai-server` at all — not even as a sibling subfolder to `rag/`. `ingestion/` becomes a new top-level directory
next to `app/`, `api-server/`, `ai-server/`, with its own `pyproject.toml` and `uv`-managed virtualenv,
mirroring how every other service in this repo is already its own independently-installed project. Because it
is a separate Python project (no shared `sys.path`, no dependency on `ai-server` being installed as a package),
it cannot import `ai-server/src/rag/*` — the small amount of Qdrant-client and embedding logic that both sides
need is independently implemented in each project rather than shared, since introducing a shared internal
package between two otherwise-independent projects would add more coupling/tooling overhead than the ~30 lines
of glue code are worth.

```
interviewer/                          # repo root
├── app/                              # unchanged
├── api-server/                       # unchanged
├── ai-server/
│   └── src/
│       ├── agent/graph.py            # binds retrieve_resume_guidance tool (Decision 4)
│       └── rag/
│           ├── __init__.py
│           ├── config.py             # RAG_* settings layered on core.config
│           ├── embeddings.py         # embed_query() only — task_type="RETRIEVAL_QUERY"
│           ├── qdrant_client.py      # singleton QdrantClient factory (read path)
│           └── retrieval/
│               ├── __init__.py
│               ├── retriever.py      # embed query -> qdrant search -> top-k chunk texts
│               └── tool.py           # LangChain StructuredTool: retrieve_resume_guidance
└── ingestion/                        # new top-level project, sibling to ai-server
    ├── pyproject.toml                # own uv-managed project (python-version pinned, like ai-server)
    ├── .python-version
    └── src/
        └── ingestion/
            ├── __init__.py
            ├── config.py             # reads RAG_*/GOOGLE_API_KEY from env (loads root .env directly)
            ├── embeddings.py         # embed_documents() only — task_type="RETRIEVAL_DOCUMENT"
            ├── qdrant_client.py      # singleton QdrantClient factory (write path)
            ├── corpus/               # source guidance docs (markdown), version-controlled
            ├── loader.py             # reads corpus/*.md
            ├── chunker.py            # splits docs into embeddable chunks (heading-aware)
            ├── pipeline.py           # loader -> chunker -> embeddings.embed_documents -> qdrant upsert
            └── run.py                # CLI entrypoint: `uv run python -m ingestion.run [--recreate-collection]`
```

**Alternatives considered**:
- Nesting ingestion under `ai-server/src/rag/ingestion/` or `ai-server/src/ingestion/` — rejected per explicit
  direction that ingestion must not live inside `ai-server` at all, regardless of subfolder isolation.
- A shared internal package (e.g. a `libs/rag-shared` workspace member) for the embedding/Qdrant glue both
  sides need — rejected as premature: the duplicated code is small (two thin wrapper functions plus client
  construction), and a shared package would require workspace/path-dependency tooling neither project
  currently has, for no benefit beyond avoiding ~30 lines of duplication.

### 2. Embedding model: `gemini-embedding-001` via `GoogleGenerativeAIEmbeddings`, truncated to 768 dims

Google's current recommended embedding model is `gemini-embedding-001` (native 3072 dims, MRL-truncatable to
smaller sizes with minimal quality loss). Both projects request `output_dimensionality=768` — enough quality
for a guidance corpus that's likely low-thousands of chunks, while keeping Qdrant Cloud storage/cost down
(relevant since it's a paid cluster). Google's docs note outputs below 3072 dims aren't pre-normalized, so both
`ingestion/embeddings.py` (before upsert) and `ai-server/rag/embeddings.py` (before search) L2-normalize
vectors before use, so the two independently-implemented wrappers must agree on normalization even though they
aren't sharing code — this is called out explicitly in each file's docstring, not left implicit.

`ingestion` uses `task_type="RETRIEVAL_DOCUMENT"` when embedding corpus chunks; `ai-server/rag` uses
`task_type="RETRIEVAL_QUERY"` when embedding the live query. Gemini's embedding API tunes the vector space
differently per task type, and mismatching them silently degrades relevance without erroring — this is the
main reason each side's `embeddings.py` only implements the one function it needs (no shared module that could
let a caller pick the wrong task type).

**Alternatives considered**: `text-embedding-004` (older, 768-dim native, no task-type-driven quality boost for
this asymmetric doc/query case) — rejected in favor of the newer model since we're building this fresh.

### 3. Qdrant collection: one collection, `resume_guidance`, payload-filtered by section (optional)

A single Qdrant collection (`resume_guidance`, configurable via `RAG_QDRANT_COLLECTION`, same env var name in
both projects) holds all chunks. Each point's payload carries `{text, source_doc, section}` (e.g.
`section: "summary" | "experience" | "skills" | "general"`) so retrieval *can* filter by section later, but the
initial `retrieve_resume_guidance` tool does a plain top-k similarity search with no filter — the agent
doesn't yet have a reliable signal for "which resume section is being discussed" to pass as a filter, and
adding one is speculative until real usage shows it's needed.

### 4. Retrieval exposed as one more bound LangGraph tool, not a pre-retrieval step

`retrieve_resume_guidance(query: str) -> list[str]` is added to `all_tools` in `_build_graph`
(`ai-server/src/agent/graph.py`), alongside the MCP tools and `propose_profile_update`. This mirrors the
existing pattern exactly (tool-calling loop decides when to call it) rather than always retrieving before every
model call — the agent only needs guidance when it's about to draft a resume edit, not on every turn (e.g. not
during small talk or clarifying questions), so an always-on RAG injection would waste calls and context budget
that pure tool-calling only spends when relevant.

The system prompt (`SYSTEM_PROMPT` in `graph.py`) is updated to instruct the model to call
`retrieve_resume_guidance` before calling `propose_profile_update`, similar to how it's already instructed to
read the candidate's profile first for list fields.

This tool is unconditionally bound (like `propose_profile_update`), independent of whether MCP tools loaded
successfully, since it has no candidate-scoping dependency.

### 5. Ingestion trigger: manual CLI only, no automation in this phase

`uv run python -m ingestion.run` (run from the `ingestion/` project root, its own `uv`-managed environment)
re-embeds the entire corpus and upserts into Qdrant (idempotent — points are keyed by a deterministic id
derived from `source_doc + chunk_index`, so re-running after editing `corpus/*.md` overwrites existing points
rather than duplicating them). A `--recreate-collection` flag drops and recreates the collection for
schema/dimension changes. No webhook, no scheduled job, no file-watcher, no docker-compose service — a
maintainer runs this by hand, from the `ingestion/` directory, after editing the corpus.

### 6. Configuration additions

New env vars, read independently by each project from the same root `.env` (no shared config module, per
Decision 1 — `ai-server/src/core/config.py` and `ingestion/src/ingestion/config.py` each declare and parse
their own copies):
- `GOOGLE_API_KEY` — already exists for `ai-server`; `ingestion` reads the same key from root `.env` for its
  own embedding calls.
- `RAG_QDRANT_URL` — Qdrant Cloud cluster URL.
- `RAG_QDRANT_API_KEY` — Qdrant Cloud API key.
- `RAG_QDRANT_COLLECTION` — defaults to `resume_guidance`.
- `RAG_EMBEDDING_MODEL` — defaults to `models/gemini-embedding-001`.
- `RAG_TOP_K` — `ai-server`-only; defaults to `5`.

`docker-compose.yml`'s `ai-server` service gets `RAG_QDRANT_URL` / `RAG_QDRANT_API_KEY` / `RAG_QDRANT_COLLECTION`
/ `RAG_EMBEDDING_MODEL` / `RAG_TOP_K` added to its `environment:` block (retrieval runs inside the container).
`ingestion` is not added to `docker-compose.yml` at all — it's a local-only CLI tool, run natively via `uv` from
a developer's machine against root `.env` directly (via `python-dotenv`), same as how `ai-server` and
`api-server` are installed natively for editor tooling but is a divergence in that ingestion is *only* ever run
natively, never containerized.

## Risks / Trade-offs

- **[Risk]** Embedding `task_type` mismatch (query vs. document) silently degrades retrieval quality instead
  of erroring → **Mitigation**: each project's `embeddings.py` implements only the one function it needs
  (`embed_documents()` in `ingestion`, `embed_query()` in `ai-server/rag`), each hardcoding its own `task_type`,
  so there's no shared function signature that could let a caller pass the wrong type.
- **[Risk]** Duplicated embedding/Qdrant-client logic across two projects drifts out of sync (e.g. one side
  changes `output_dimensionality` or normalization and the other doesn't) → **Mitigation**: both files carry an
  explicit docstring cross-reference to this design doc's Decision 2, and `RAG_EMBEDDING_MODEL` /
  `RAG_QDRANT_COLLECTION` env var names are kept identical across both `.env` sections so a config mismatch is
  at least visible in one place; accepted as the cost of full project independence (see Decision 1
  alternatives).
- **[Risk]** Empty/misconfigured corpus at first use means the tool returns nothing useful, and the agent has
  no way to know retrieval degraded → **Mitigation**: `retriever.py` returns an explicit
  `"No guidance found."` sentinel string rather than an empty list, and this is logged at `warning` level
  server-side so it's visible in `ai-server` logs without surfacing a confusing empty tool result to the model.
- **[Risk]** Qdrant Cloud being paid means an ingestion bug that spins in a loop (e.g. re-embedding on every
  request instead of on-demand) could run up cost → **Mitigation**: enforced structurally, not just by
  convention — `ingestion` is a wholly separate project/repo-root folder that `ai-server` cannot import from
  even by accident (different Python environment entirely); only `ai-server/src/rag/retrieval/*` is imported
  into the request path.
- **[Risk]** `output_dimensionality=768` truncation loses some retrieval quality vs. full 3072-dim vectors →
  **Mitigation**: acceptable trade-off for a guidance corpus (not open-domain search); revisit if retrieval
  quality proves insufficient once real corpus content exists.
- **[Trade-off]** No section-aware filtering at launch means a query about "how to phrase a skills bullet"
  could retrieve an experience-section example → accepted for now (see Decision 3); the payload schema already
  supports adding a filter later without re-ingesting.

## Migration Plan

1. Scaffold the new `ingestion/` project at the repo root: `pyproject.toml`, `.python-version` (matching
   `ai-server`'s `3.12`), `uv sync` to create its own `.venv`; add `qdrant-client`, `langchain-google-genai`
   (for `GoogleGenerativeAIEmbeddings`), and `python-dotenv` as its dependencies.
2. Add `qdrant-client` to `ai-server/pyproject.toml` too (needed for its own read-path `qdrant_client.py`);
   confirm `GoogleGenerativeAIEmbeddings` is importable from `ai-server`'s existing `langchain-google-genai`.
3. Add new `RAG_*` env vars to `.env` (repo root) and to `docker-compose.yml`'s `ai-server` service.
4. Land `ai-server/src/rag/` (config, embeddings, qdrant_client, retrieval/) and the `ingestion/` project's
   modules, with no corpus content yet — both are dead code until step 6.
5. Author initial corpus markdown files under `ingestion/src/ingestion/corpus/`.
6. From the `ingestion/` directory, run `uv run python -m ingestion.run --recreate-collection` once to create
   the collection and populate it.
7. Bind `retrieve_resume_guidance` into `ai-server`'s `graph.py`'s `all_tools` and update `SYSTEM_PROMPT`; ship.

**Rollback**: unbind the tool from `all_tools` and revert the system prompt change — the agent falls back to
its current ungrounded behavior immediately, no data migration to undo (Qdrant collection can simply be left
in place or dropped independently). `ingestion/` can be deleted entirely without touching `ai-server`.

## Open Questions

- Who owns/authors the actual resume-writing guidance corpus content, and where does it get reviewed/updated
  over time? (Not blocking this change — corpus is empty at first ship — but affects when this actually
  improves output quality.)
- Should `retrieve_resume_guidance` ever be exposed as a manually-triggerable action for the candidate (e.g.
  "show me writing tips"), or should it remain purely an internal grounding step invisible to the user? Current
  design assumes the latter.
- Is it acceptable long-term to duplicate embedding/Qdrant-client glue across `ingestion` and `ai-server`, or
  should a future change introduce a shared internal package once the two pieces of logic show signs of drift?
  Deferred per Decision 1's alternatives.
