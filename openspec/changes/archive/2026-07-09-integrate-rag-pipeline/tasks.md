## 1. Scaffold the `ingestion/` Project (repo root, separate from `ai-server`)

- [x] 1.1 Create `ingestion/pyproject.toml` (own standalone project, no dependency on `ai-server`) and
      `ingestion/.python-version` (`3.12`, matching `ai-server`)
- [x] 1.2 Run `uv sync` inside `ingestion/` to create its own `.venv`; add `qdrant-client`,
      `langchain-google-genai`, and `python-dotenv` as dependencies (latest versions) via `uv add`
- [x] 1.3 Create `ingestion/src/ingestion/__init__.py` package skeleton

## 2. Configuration

- [ ] 2.1 Add `RAG_QDRANT_URL`, `RAG_QDRANT_API_KEY`, `RAG_QDRANT_COLLECTION` (default `resume_guidance`),
      `RAG_EMBEDDING_MODEL` (default `models/gemini-embedding-001`), `RAG_TOP_K` (default `5`) to `.env`
      (repo root)
- [x] 2.2 Add `RAG_QDRANT_URL`, `RAG_QDRANT_API_KEY`, `RAG_QDRANT_COLLECTION`, `RAG_EMBEDDING_MODEL`,
      `RAG_TOP_K` to `ai-server/src/core/config.py`'s `CONFIG`, and to `docker-compose.yml`'s `ai-server`
      service `environment:` block
- [x] 2.3 Implement `ingestion/src/ingestion/config.py` — reads `RAG_QDRANT_URL`, `RAG_QDRANT_API_KEY`,
      `RAG_QDRANT_COLLECTION`, `RAG_EMBEDDING_MODEL`, `GOOGLE_API_KEY` directly from the environment (loading
      root `.env` via `python-dotenv`, since `ingestion` is a standalone project with no access to
      `ai-server`'s config module)

## 3. `ai-server` RAG Infrastructure (`ai-server/src/rag/` — retrieval side only)

- [x] 3.1 Add `qdrant-client` to `ai-server/pyproject.toml` via `uv add qdrant-client` (latest version);
      confirm `GoogleGenerativeAIEmbeddings` is importable from the existing `langchain-google-genai` dep
- [x] 3.2 Create `ai-server/src/rag/__init__.py` and `ai-server/src/rag/config.py` (reads `RAG_*` from
      `core.config.CONFIG`)
- [x] 3.3 Implement `ai-server/src/rag/qdrant_client.py` — singleton `QdrantClient` factory using
      `RAG_QDRANT_URL` / `RAG_QDRANT_API_KEY`
- [x] 3.4 Implement `ai-server/src/rag/embeddings.py` with `embed_query(text: str) -> list[float]` only
      (hardcodes `task_type="RETRIEVAL_QUERY"`, requests `output_dimensionality=768`, L2-normalizes before
      returning) — no `embed_documents` here, that lives only in `ingestion`

## 4. `ingestion` Pipeline (`ingestion/src/ingestion/`)

- [x] 4.1 Implement `ingestion/src/ingestion/qdrant_client.py` — singleton `QdrantClient` factory using
      `RAG_QDRANT_URL` / `RAG_QDRANT_API_KEY` (independent copy from `ai-server`'s, per Decision 1)
- [x] 4.2 Implement `ingestion/src/ingestion/embeddings.py` with `embed_documents(texts: list[str]) ->
      list[list[float]]` only (hardcodes `task_type="RETRIEVAL_DOCUMENT"`, requests
      `output_dimensionality=768`, L2-normalizes before returning)
- [x] 4.3 Create `ingestion/src/ingestion/corpus/` folder (empty initially, one placeholder markdown file)
- [x] 4.4 Implement `loader.py` — reads all `*.md` files under `corpus/`
- [x] 4.5 Implement `chunker.py` — heading-aware chunking of loaded documents into embeddable text chunks
- [x] 4.6 Implement `pipeline.py` — orchestrates loader → chunker → `embeddings.embed_documents` → Qdrant
      upsert, using a deterministic point id derived from `source_doc` + chunk index (idempotent re-runs)
- [x] 4.7 Implement `run.py` CLI entrypoint (`uv run python -m ingestion.run [--recreate-collection]`) that
      creates the Qdrant collection (768-dim, cosine distance) if missing, or drops/recreates it when
      `--recreate-collection` is passed, then runs the pipeline
- [x] 4.8 Verify `ingestion/` has zero import references from `ai-server/src/agent/graph.py` or
      `ai-server/src/rag/retrieval/*` — structurally guaranteed since it's a separate Python project, but
      confirm no path hacks (`sys.path.append`, etc.) were introduced

## 5. Retrieval Tool (`ai-server/src/rag/retrieval/`)

- [x] 5.1 Create `ai-server/src/rag/retrieval/__init__.py`
- [x] 5.2 Implement `retriever.py` — `retrieve(query: str, top_k: int = RAG_TOP_K) -> list[str]`: calls
      `rag.embeddings.embed_query`, searches the Qdrant collection, returns matched chunk texts; returns
      `["No guidance found."]` and logs a `warning` when the search yields zero results
- [x] 5.3 Implement `tool.py` — `StructuredTool` named `retrieve_resume_guidance` wrapping `retriever.retrieve`,
      with a description telling the model when to call it (before drafting resume edits)

## 6. Agent Graph Integration

- [x] 6.1 In `ai-server/src/agent/graph.py`, import `retrieve_resume_guidance` from `rag.retrieval.tool` and
      add it to `all_tools` in `_build_graph` (unconditionally bound, alongside `PROPOSE_PROFILE_UPDATE_TOOL`)
- [x] 6.2 Update `SYSTEM_PROMPT` to instruct the model to call `retrieve_resume_guidance` for relevant writing
      guidance before calling `propose_profile_update`
- [ ] 6.3 Manually verify via a local `ai-server` run: ask the agent to rewrite a resume bullet, confirm
      `retrieve_resume_guidance` is called (check logs/Langfuse trace if enabled) before
      `propose_profile_update`

## 7. Initial Corpus & Validation

- [x] 7.1 Author a small initial set of resume-writing guidance markdown docs under
      `ingestion/src/ingestion/corpus/` (e.g. quantifying impact, action verbs, common mistakes,
      section-specific tips)
- [ ] 7.2 From the `ingestion/` directory, run `uv run python -m ingestion.run --recreate-collection` against
      the real Qdrant Cloud cluster and confirm the `resume_guidance` collection is populated (check point
      count via Qdrant Cloud console or `qdrant-client`)
- [ ] 7.3 Re-run ingestion without `--recreate-collection` after a no-op corpus change and confirm point count
      is unchanged (idempotency check)
- [ ] 7.4 Run a manual retrieval smoke test from `ai-server` (direct call to `retriever.retrieve` with a
      sample query) and confirm relevant chunks come back
