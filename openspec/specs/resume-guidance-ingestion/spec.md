# resume-guidance-ingestion

## Purpose

Standalone, manually-triggered pipeline in its own top-level `ingestion/` project at the repo root that chunks
and embeds a curated resume-writing knowledge base into Qdrant, fully decoupled from `ai-server` and the
request-serving path.

## Requirements

### Requirement: Ingestion is a manually-triggered CLI pipeline, decoupled from the request path
The resume-writing guidance corpus SHALL be chunked, embedded, and upserted into Qdrant via a manually-invoked
CLI entrypoint (`uv run python -m ingestion.run`), living in its own top-level `ingestion/` project at the
repo root (a sibling to `app/`, `api-server/`, `ai-server/` — not nested inside `ai-server` at all, its own
`pyproject.toml` and `uv`-managed environment). This ingestion code SHALL NOT be imported by, or reachable
from, any request-serving code path (`ai-server/src/agent/graph.py`, `ai-server/src/rag/retrieval/*`) — this is
structurally guaranteed by `ingestion` being a wholly separate Python project with no shared `sys.path`.

#### Scenario: Maintainer runs ingestion after editing the corpus
- **WHEN** a maintainer edits a markdown file under `ingestion/src/ingestion/corpus/` and runs, from the
  `ingestion/` directory, `uv run python -m ingestion.run`
- **THEN** the pipeline loads all corpus documents, chunks them, embeds each chunk, and upserts the resulting
  vectors into the Qdrant `resume_guidance` collection, without requiring any running `ai-server` HTTP request

#### Scenario: No automatic trigger exists
- **WHEN** a candidate's profile is created, updated, or an interview conversation happens
- **THEN** no ingestion code runs as a side effect — ingestion only ever runs via the explicit CLI command

### Requirement: Ingestion is idempotent and re-runnable
Re-running ingestion after editing the corpus SHALL overwrite previously-ingested points for changed content
rather than creating duplicates, using a deterministic point id derived from the source document and chunk
index.

#### Scenario: Re-running after a corpus edit
- **WHEN** ingestion is run twice in a row with the same corpus content
- **THEN** the Qdrant collection's point count and contents are identical after both runs (no duplicate points)

#### Scenario: Schema or embedding dimension change
- **WHEN** the embedding model or output dimensionality changes and existing vectors are no longer compatible
- **THEN** running ingestion with a `--recreate-collection` flag drops and recreates the Qdrant collection
  before re-upserting all points

### Requirement: Document chunks are embedded with the indexing-tuned task type
Ingestion SHALL embed each corpus chunk using the Gemini embedding model with `task_type="RETRIEVAL_DOCUMENT"`,
and SHALL L2-normalize the resulting vector before upserting, matching the normalization applied to query
vectors at retrieval time.

#### Scenario: Chunk embedding during ingestion
- **WHEN** the ingestion pipeline embeds a corpus chunk
- **THEN** it calls the embeddings wrapper's `embed_documents()` function, which hardcodes
  `task_type="RETRIEVAL_DOCUMENT"`, and normalizes the resulting vector before it is upserted into Qdrant
