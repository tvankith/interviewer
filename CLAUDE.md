# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- Always install the latest version of npm packages (`npm install package@latest`), never pin to an older version.

## What this is

An AI-powered interview platform: an AI agent conducts technical interviews and helps candidates build/edit
resumes, proposing edits that the candidate reviews and approves (human-in-the-loop) before anything is persisted.

## Architecture — actual vs. documented

`docker-compose.yml` is the source of truth for what actually runs. Treat these as stale and ignore them:

- `.claude/ARCHITECTURE-AND-DEVELOPMENT-GUIDE.md`, `.claude/MONO-REPO-STRUCTURE.md`, `.claude/SPECS-OVERVIEW.md`,
  root `.claude/claude.md`, and `app/.claude/`, `ai-server/.claude/`, `server/.claude/` references in
  `.claude/CLAUDE.md` — they describe an older two-service Python split (`server` FastAPI + `ai-server`
  LangChain) and a `server/` directory that no longer exist; per-service `PATTERNS.md`/`RULES.md`/
  `FOLDER-STRUCTURE.md` docs under `app/.claude/` may also no longer match current code.
- `ENV_SETUP.md` — describes a `server`/`agent-server` split, `make env-setup`/`make dev-app` targets, Redis, and
  `.env.example` files, none of which exist anymore. There is currently no committed `.env` template; create
  `.env` at the repo root yourself, populating whatever `${VAR}` references `docker-compose.yml` needs.
  `POSTGRES_PASSWORD` is hardcoded to `changeme` in `docker-compose.yml` itself, not read from `.env`.
- The root `Makefile` and the entire `openspec/` planning-doc tree have been deleted outright (see the "Clean
  the repo" commit) — don't look for `make docker-*` targets or `openspec new change` workflows; neither exists
  in this repo anymore. Use `docker compose` directly (see Commands below).
- No `.devcontainer/` configs exist in this repo — ignore any doc that mentions attaching VS Code to a
  per-service dev container.

The real, currently-running services:

| Service | Port | Stack | Role |
|---|---|---|---|
| `app` | 3000 | Next.js (React 19, TS) | Frontend: auth, dashboards, resume editor, interview session UI |
| `api-server` | 3002 | Fastify + Prisma + PostgreSQL | User auth (Supabase JWT), candidate profiles/resumes, Resume MCP server (`/mcp`), resume parsing (PDF/DOCX), conversation-thread registry |
| `ai-server` | 3004 | FastAPI + LangGraph + Postgres checkpointer | Interview-agent service: Gemini tool-calling agent over MCP resume tools, with Langfuse tracing |

There are two PostgreSQL databases, created via `docker/init-db.sh` from `POSTGRES_MULTIPLE_DATABASES` in
`docker-compose.yml`: `api_server_database` (owned by `api-server`, `API_SERVER_DATABASE_URL`) and
`agent_server_database` (used by `ai-server`, `AGENT_SERVER_DATABASE_URL`, holding its LangGraph Postgres
checkpointer tables).

### The interview agent (`ai-server/src/agent/graph.py`)

This is a standard LangGraph `agent` ⇄ `tools` loop (Gemini via `ChatGoogleGenerativeAI`, `ToolNode` +
`tools_condition`), not a toy graph:

- On each `/api/agent` call it opens a fresh `MultiServerMCPClient` against `api-server`'s `/mcp` endpoint
  (stateless per-request MCP server, so no persistent connection), scoped to the candidate via an
  `x-candidate-id` header, and filters to a **read-only allowlist** (`get_candidate_profile`,
  `get_profile_specs`, `get_profile_spec`) — mirrors the tool split that used to live in the now-removed
  `resume-agent` service's `mcp-tools.ts`.
- The agent can never write directly. To suggest a resume change it calls the local
  `propose_profile_update` tool, which is a pure pass-through (no side effect) — it just surfaces a proposed
  diff. Persisting an approved proposal happens entirely outside `ai-server`, via the candidate hitting
  `api-server`'s authenticated `PATCH /api/profile/:id` themselves after reviewing the diff. List fields
  (skills/projects/experiences/educations/links) are replaced wholesale by that endpoint, so a proposal
  touching one entry must include the complete array.
- Conversation state is keyed by `thread_id` in the `AsyncPostgresSaver` checkpointer. When `ai-server` mints a
  new thread it fires an unauthenticated, best-effort webhook (`POST /api/webhooks/conversation-threads`) to
  `api-server` to register the thread↔candidate mapping (`conversation_thread` table); `api-server` in turn
  proxies `GET .../:threadId/messages` back to `ai-server` after verifying the thread belongs to the requesting
  candidate.
- Langfuse tracing (`CallbackHandler` + `propagate_attributes`) is opt-in and fail-open: it only activates when
  both `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` are set; otherwise the agent runs identically without it.
- Requests are authenticated with Supabase JWTs (`core/auth.py: require_user_id`), same token scheme as
  `api-server`.

### Data flow

- `app` proxies most calls (auth, profile CRUD, resume templates, conversation-thread listing) server-side
  through `app/src/app/api/[...path]/route.ts` to `api-server`, including access-token refresh handling.
- `app` also talks to `ai-server` **directly, client-side**, for the interview agent chat
  (`aiServerAxiosInstance` in `app/src/apis/chat.ts` → `NEXT_PUBLIC_AI_SERVER_URL`, i.e. `POST /api/agent`)
  — this bypasses the `api-server` proxy entirely.
- `api-server` exposes resume/profile reads and writes as MCP tools (`api-server/src/mcp`) that `ai-server`
  consumes over `streamable_http`.

> Note: `resume-agent` (the Vercel AI SDK-based chat agent that used to edit resumes via `api-server`'s MCP
> tools, with its own HITL approval flow) has been removed as a standalone service — that role is now filled by
> `ai-server`'s `propose_profile_update` tool + the candidate's own `PATCH /api/profile/:id` call, described
> above.
>
> `tracing` (a standalone Next.js + Prisma LLM tracing/observability dashboard) has also been removed, along
> with its `/api/tracing` rewrite in `app/next.config.ts` and the Traces tab in `app`'s Analytics page. LLM
> observability now goes through Langfuse (`ai-server`'s integration) instead.

## Commands

Run everything together (recommended — this is what the Dockerfiles/compose actually wire up):

```bash
docker compose up            # start postgres, adminer, api-server, ai-server, app
docker compose up -d          # detached
docker compose logs -f
docker compose down           # stop, keep volumes
docker compose down -v        # stop, delete volumes
```

`.env` at the repo root must supply whatever `${VAR}` compose interpolates (`API_SERVER_DATABASE_URL`,
`API_SERVER_DATABASE_DIRECT_URL`, `AGENT_SERVER_DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_JWT_SECRET`, `GOOGLE_API_KEY`, `LANGFUSE_*`, `API_SERVER_URL`) — there's no committed template, so pull
the current list straight from `docker-compose.yml`. Adminer (DB viewer) is on `http://localhost:8081`.

**Editor IntelliSense**: install natively on the host, version-pinned to match each service's Docker base image,
then open the whole repo in one plain VS Code window — Pylance/TS resolve every service at once. Never copy
container-built `node_modules`/`.venv` onto the Mac host: those are Linux binaries (`bcrypt`, `sharp`,
`psycopg`, etc.) that break at import time on macOS even on Apple Silicon. Build fresh host-native deps instead,
pinned via each service's version file the same way `docker-compose.yml`'s images are pinned:

- **Node services** (`app`, `api-server`; Dockerfiles use `node:24-alpine`): install
  [nvm](https://github.com/nvm-sh/nvm), then each service has an `.nvmrc` (`24`) — `cd <service> && nvm use &&
  npm install`.
- **ai-server** (Dockerfile uses `python:3.12-slim` + `uv`): install `uv` (`brew install uv`), then `cd ai-server
  && uv sync` — `uv` reads the existing `.python-version` (`3.12`) and manages a matching interpreter itself.

This doesn't conflict with the containers' own copies — Docker Compose stores those in named volumes, separate
from the host filesystem — so `docker compose up` and native editing coexist. Re-run the relevant install after
pulling changes that touch `package.json`/`pyproject.toml`, since the two dependency sets don't auto-sync.

Per-service, running from the terminal (same native installs as above, just to execute rather than edit):

**app** (Next.js, port 3000)
```bash
cd app
npm install && npm run dev
npm run build
npm run lint
npm run storybook          # Storybook on :6006
```
Tests live via Storybook/Vitest (`vitest.config.ts` runs Storybook interaction tests), not a plain `npm test`.

**api-server** (Fastify + Prisma, port 3002; Swagger at `/documentation`)
```bash
cd api-server
npm install && npm run dev
npm run build               # tsup
npm run lint                # eslint src --ext .ts
npm run type-check          # tsc --noEmit
npm test                    # jest
npm test -- path/to/file.test.ts   # single file
npm run test:watch
npm run db:seed             # tsx prisma/seed.ts
```
Tests are colocated in `src/**/__tests__/*.test.ts`.

**ai-server** (FastAPI + LangGraph, port 3004)
```bash
cd ai-server
uv sync
uv run uvicorn src.main:app --reload --port 3004
```
No lint/test tooling configured yet.

## Cross-service conventions

- **MCP**: `api-server` exposes resume/profile operations as MCP tools (`api-server/src/mcp`); `ai-server`
  consumes a read-only subset of them per-request via `langchain-mcp-adapters`.
- **Auth**: Supabase-issued JWTs, verified by both `api-server` (`@fastify/jwt` + `SUPABASE_JWT_SECRET`) and
  `ai-server` (`core/auth.py`).
- **Prisma**: `api-server` owns its own `prisma/schema.prisma` and database (`user`, `candidate_profile`,
  `profile_spec`, `conversation_thread`, `resume_template` models).
- **LLM provider**: Google Gemini (`@ai-sdk/google` in `api-server`, `langchain-google-genai` in `ai-server`),
  not Anthropic, despite `ANTHROPIC_API_KEY` being used for the dev-container's own Claude Code instance in
  `docker-compose.yml`.
- **HITL edits**: the agent never persists resume changes itself — it always proposes via a dedicated tool, and
  persistence only happens through the candidate's own authenticated `api-server` call. Don't add a path that
  lets `ai-server` write to the profile directly.

## Agent skills

`.agents/skills/` contains LangChain/LangGraph/Deep Agents/Prisma/AI SDK skill docs — check there first when
working on `ai-server` agent internals (e.g. `langgraph-human-in-the-loop`, `langchain-middleware`, `ai-sdk`,
`migrate-ai-sdk-v6-to-v7`).
