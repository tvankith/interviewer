# Monorepo Structure

```
interviewer/
├── app/              # Frontend (Next.js, TypeScript)
├── server/           # Backend (FastAPI, Python, PostgreSQL)
├── ai-server/        # AI Agent (LangChain, Claude)
├── serverless/       # Deployment config
├── agent-skills/     # Custom agent skills
├── docs/             # Documentation
├── specs/            # Specifications
└── .claude/          # Project specs & config
```

## Services

| Service | Stack | Purpose |
|---------|-------|---------|
| **app** | Next.js | Frontend: auth, dashboard, session management |
| **server** | FastAPI + PostgreSQL | Backend: user auth, resume processing, DB ops |
| **ai-server** | LangChain + Claude | Agent: interviews, chat history, resume analysis |
| **serverless** | — | Deployment & CI/CD config |

## Data Flow

```
app (frontend)
  ↓ auth, resume
server (backend) ← PostgreSQL
  ↓ context                      ↑ webhook (new sessions)
  ├→ ai-server (agent) → Claude API
  └→ chat history (stored in ai-server DB)
```

## Key Responsibilities

- **app**: Authentication, UI, session management
- **server**: Resume MCP handler, user/DB ops, chat session tracking (via webhooks)
- **ai-server**: Interview conversations, chat history (per session_id), webhook notifications

## Setup

```bash
cd app && npm install              # Frontend
cd ../server && pip install -r requirements.txt
cd ../ai-server && pip install -r requirements.txt
```

## Running

```bash
# Terminal 1-3
npm run dev          # app (port 3000)
uvicorn main:app     # server (port 8000)
uvicorn main:app     # ai-server (port 8001)
```

## Service Specs

- `app/CLAUDE.md` — Frontend
- `server/CLAUDE.md` — Backend
- `ai-server/CLAUDE.md` — Agent
- `.claude/CLAUDE.md` — Monorepo config
