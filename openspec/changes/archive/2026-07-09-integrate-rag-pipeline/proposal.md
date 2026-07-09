## Why

The interview agent in `ai-server` runs a smaller Gemini model (`gemini-2.5-flash`) to help candidates rewrite
resume content. Without grounding, a small model's resume-writing suggestions (phrasing, quantifying impact,
action verbs, formatting conventions) are inconsistent. Retrieving relevant resume-writing guidance from a
curated knowledge base before the model drafts a suggestion should make its `propose_profile_update` output
noticeably better, without needing a bigger/more expensive model.

## What Changes

- Add a new top-level `ingestion/` project at the repo root (sibling to `app/`, `api-server/`, `ai-server/` —
  not a subfolder of any of them, its own `pyproject.toml` and `uv`-managed environment): chunks a curated
  resume-writing knowledge base (guides, before/after examples, do/don't rules), embeds each chunk with
  Gemini's embedding model, and upserts into a Qdrant Cloud collection. Run manually/on-demand only — never
  wired to any request path, and structurally unable to be imported by `ai-server` since it's a separate
  Python project.
- Add a `rag/` package inside `ai-server` (shared Qdrant/embedding clients + a `retrieval/` module) that embeds
  the current conversation context at query time and searches the same Qdrant collection for the top-k most
  relevant chunks.
- Add a new LangGraph tool, `retrieve_resume_guidance`, bound into the existing agent graph
  (`ai-server/src/agent/graph.py`) alongside the current MCP and `propose_profile_update` tools, so the model
  can pull writing guidance mid-conversation the same way it already pulls profile data.
- Update the system prompt so the model knows to consult `retrieve_resume_guidance` before proposing resume
  edits.
- Add Qdrant + Gemini-embedding configuration (`RAG_QDRANT_URL`, `RAG_QDRANT_API_KEY`, `RAG_QDRANT_COLLECTION`,
  `RAG_EMBEDDING_MODEL`) to both `ai-server`'s config (`docker-compose.yml`/`.env` surface) and `ingestion`'s
  own config (read directly from root `.env`).

No changes to `app` or `api-server`.

## Capabilities

### New Capabilities
- `resume-guidance-retrieval`: query-time retrieval tool, bound into the interview agent's LangGraph inside
  `ai-server`, that fetches relevant resume-writing guidance from Qdrant given the current conversation
  context.
- `resume-guidance-ingestion`: standalone, manually-triggered pipeline in its own top-level `ingestion/`
  project at the repo root, that chunks and embeds a curated resume-writing knowledge base into Qdrant,
  fully decoupled from `ai-server` and the request-serving path.

### Modified Capabilities
(none — this only adds new tools/modules to the existing agent graph plus a new standalone project; no
existing spec-level requirement changes)

## Impact

- **New top-level project**: `ingestion/` at the repo root — its own `pyproject.toml`, `.python-version`, and
  `uv`-managed `.venv`, structured the same way `ai-server` already is.
- **New code in `ai-server`**: `ai-server/src/rag/` (`config.py`, `embeddings.py` with `embed_query()` only,
  `qdrant_client.py`, `retrieval/`).
- **Modified code**: `ai-server/src/agent/graph.py` (new bound tool + system prompt update),
  `ai-server/src/core/config.py` (new `RAG_*` env vars).
- **New dependencies**: `qdrant-client` and `langchain-google-genai`'s `GoogleGenerativeAIEmbeddings` in
  *both* `ai-server/pyproject.toml` and the new `ingestion/pyproject.toml` (each project independently
  installs what it needs — no shared internal package between them); install via `uv add`/`uv sync`, latest
  versions, matching this repo's existing `uv`-managed dependency flow.
- **New external dependency**: Qdrant Cloud (already provisioned — cluster URL + API key to be supplied via
  `.env`, no new self-hosted infra).
- **Ops**: `ingestion` is a manual CLI invocation (`uv run python -m ingestion.run`, run natively from the
  `ingestion/` directory) — not a service, no Dockerfile, no docker-compose entry. Only `ai-server`'s
  `docker-compose.yml` environment block gains the new `RAG_*` vars (for the retrieval side, which does run
  inside the container).
