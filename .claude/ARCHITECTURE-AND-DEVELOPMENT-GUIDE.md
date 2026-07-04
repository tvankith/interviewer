# Architecture & Development Guide

A comprehensive guide for bug fixing, feature development, and cross-project analysis.

---

## 1. System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────┐
│              Frontend (Next.js)                 │
│  app/ — Auth, Dashboard, Session Management    │
└─────────────────┬───────────────────────────────┘
                  │
           ┌──────┴──────┐
           │             │
    ┌──────▼─────┐  ┌────▼──────────┐
    │  Backend    │  │  AI Server    │
    │  (FastAPI)  │  │  (LangChain)  │
    │  server/    │  │  ai-server/   │
    └──────┬──────┘  └────▲──────────┘
           │              │
    ┌──────▼─────────────────┐
    │  PostgreSQL Database   │
    │  (Alembic migrations)  │
    └────────────────────────┘
```

### Service Breakdown

| Service | Port | Stack | Responsibilities |
|---------|------|-------|---|
| **app** | 3000 | Next.js + TypeScript | Frontend UI, auth state, session management |
| **server** | 8000 | FastAPI + Python | REST API, user auth, DB ops, resume MCP |
| **ai-server** | 8001 | FastAPI + LangChain | Interview agent, chat history, LLM interactions |
| **PostgreSQL** | 5432 | — | All persistent data |

---

## 2. Service Communication

### Frontend → Backend

**Base URL:** `http://localhost:8000`

Common patterns:
- Authentication: Cookie-based (JWT in cookies)
- Content-Type: `application/json`
- Error handling: HTTP status codes + JSON error messages

**Key Endpoints:**
```
POST   /api/auth/login              → User login
POST   /api/auth/logout             → User logout
GET    /api/me                      → Current user info
POST   /api/profiles                → Create candidate profile
GET    /api/profiles                → List profiles
POST   /api/jobs                    → Create job requirement
GET    /api/questions/generate      → Generate questions
POST   /api/sessions                → Create interview session
POST   /api/sessions/{id}/chat      → Send chat message
GET    /api/sessions/{id}/messages  → Get chat history
```

### Backend → AI Server

**Base URL:** `http://localhost:8001` (from server to ai-server)

Communication is **synchronous** for most operations:
- Message processing: `POST /api/chat`
- Question generation: `POST /api/questions/generate`
- Analysis: `POST /api/analysis`

### AI Server → Backend (Webhooks)

**Base URL:** `http://localhost:8000` (from ai-server to server)

Asynchronous notifications:
- New session created: `POST /api/webhook/chat-session` — Notifies server when a new chat session is created in ai-server
  - Payload: `{ candidate_profile_id: UUID, ai_session_id: UUID }`
  - Creates a mapping in server's `chat_session` table

### Frontend ← Backend (Server-Sent Events / Real-Time Updates)

**Real-time resume updates** — When the AI agent edits a profile via MCP tools, the frontend receives live updates:

**SSE Endpoint:** `GET /api/profile/{profile_id}/stream`
- **Protocol:** Server-Sent Events (SSE)
- **Purpose:** Broadcast profile field updates as the AI agent modifies the resume
- **Event format:**
  ```json
  { "field": "skills", "data": { "skills": ["Python", "React", "PostgreSQL"] } }
  ```

**Data flow:**
1. User sends message to AI agent in profile editor
2. AI agent calls MCP tools (e.g., `update_skills`, `add_experience`)
3. MCP tool updates database and emits SSE event via `sse_manager.emit(profile_id, field, data)`
4. Frontend EventSource listener receives event → fetches latest profile → updates form via `fillForm()`
5. Form change triggers resume preview re-render (via react-hook-form)

**Implementation:**
- **Backend event manager:** `server/src/core/sse_manager.py` — In-memory pub/sub for profile_id channels
- **Backend endpoint:** `server/src/api/profile.py` → `GET /{profile_id}/stream`
- **Frontend subscription:** `app/src/app/(dashboard)/profiles/components/profile-editor.tsx` → useEffect with EventSource

**Scaling considerations:**
- **Single server:** Works up to ~500 concurrent connections
- **Multi-server:** Add Redis pub/sub: `redis.publish(f"profile:{profile_id}", json_event)`
- **Serverless:** Not recommended (connection timeouts); use polling instead

---

## 3. Database Schema Overview

### Core Models

**Users**
```python
- id (UUID)
- email (unique)
- password_hash
- created_at
```

**Candidate Profiles**
```python
- id (UUID)
- user_id (FK → users)
- name
- resume_data (JSON)
- skills (array)
- experience_years
- created_at
```

**Jobs / Job Requirements**
```python
- id (UUID)
- user_id (FK → users)
- title
- description
- required_skills (array)
- experience_level
- created_at
```

**Interview Sessions**
```python
- id (UUID)
- user_id (FK → users)
- candidate_profile_id (FK)
- job_id (FK)
- status (pending, in_progress, completed)
- session_id (unique, used for chat history)
- created_at
```

**Chat Messages**
```python
- id (UUID)
- session_id (FK → sessions.session_id)
- role (user, assistant)
- content
- metadata (JSON)
- created_at
```

**Chat Sessions** (Maps ai-server sessions to candidates)
```python
- id (UUID)
- candidate_profile_id (FK → candidate_profile)
- ai_session_id (UUID, unique) — Session ID from ai-server
- created_at
```

**Questions**
```python
- id (UUID)
- job_id (FK → jobs)
- category (technical, behavioral, etc.)
- text
- difficulty (easy, medium, hard)
- created_at
```

**Migrations:** Use Alembic (`alembic upgrade head`)

---

## 4. Common Development Workflows

### 🐛 Bug Fix Workflow

1. **Identify the service:**
   - Frontend issue → check `app/src/`
   - Backend/API issue → check `server/src/`
   - AI/conversation issue → check `ai-server/src/`

2. **Trace the data flow:**
   ```bash
   # Find where data is used
   grep -r "fieldName" server/src/
   grep -r "fieldName" ai-server/src/
   ```

3. **Check logs:**
   ```bash
   # Backend logs (FastAPI)
   # Look for: timestamps, error traces, request/response
   
   # Frontend logs (browser console)
   # Check network tab for API responses
   ```

4. **Affected areas to check:**
   - Database models (`server/src/db/models/`)
   - API routes (`server/src/api/`)
   - Services (`server/src/services/`)
   - Frontend components consuming the data

### ✨ Feature Development Workflow

**Example: Add a new field to candidate profiles**

1. **Database layer (server)**
   - Create migration: `alembic revision --autogenerate -m "add field"`
   - Update model: `server/src/db/models/public/candidate_profile.py`
   - Update schema: `server/src/schemas/candidate_profile.py`

2. **Backend API (server)**
   - Update API endpoint: `server/src/api/profile.py`
   - Add service logic: `server/src/services/profile_service.py`
   - Test: POST/GET `/api/profiles`

3. **Frontend (app)**
   - Create form component: `app/src/components/`
   - Add to service: `app/src/services/`
   - Update store/state if needed: `app/src/store/`
   - Wire in page: `app/src/app/(dashboard)/profiles/`

4. **AI integration (if needed)**
   - Update agent prompts: `ai-server/src/`
   - Add to context: how the AI uses this field

### 📊 Analysis & Cross-Service Investigation

**Check API contracts:**
```bash
# Backend: See all routes
grep -r "router.post\|router.get" server/src/api/

# Frontend: Find API calls
grep -r "fetch\|axios\|api\." app/src/apis/
```

**Trace data transformations:**
```bash
# From API response → frontend display
# 1. Check API response shape (server/src/api/)
# 2. Check schema validation (server/src/schemas/)
# 3. Check service consumption (app/src/services/)
# 4. Check component rendering (app/src/components/)
```

**Session-based analysis:**
```bash
# All chat-related operations use session_id
# Key files:
# - server/src/services/session_service.py
# - server/src/api/session.py
# - ai-server/src/api/message.py
# - app/src/app/(dashboard)/session/
```

---

## 5. Key File Locations

### Backend (server)

```
server/src/
├── api/              # Route handlers
│   ├── auth.py       # Login/logout
│   ├── profile.py    # Candidate profiles (includes SSE endpoint)
│   ├── job.py        # Job requirements
│   ├── session.py    # Interview sessions
│   └── message.py    # Chat messages
├── services/         # Business logic
│   ├── auth_service.py
│   ├── profile_service.py
│   ├── interview_service.py
│   └── session_service.py
├── db/
│   ├── models/       # SQLAlchemy models
│   │   ├── public/   # Public-facing models
│   │   ├── chat/     # Chat-related
│   │   └── analytics/# Analytics models
│   └── base.py       # Base model
├── schemas/          # Pydantic schemas (validation)
├── core/
│   ├── llm.py        # LLM configuration
│   ├── embeddings.py # Vector embeddings
│   ├── sse_manager.py# Server-Sent Events management
│   └── deps/         # Dependency injection
├── mcp_server/
│   └── resume.py     # MCP tools (all emit SSE on update)
└── main.py           # FastAPI app setup
```

### Frontend (app)

```
app/src/
├── app/              # Next.js routes
│   ├── (auth)/       # Login pages
│   ├── (dashboard)/  # Protected routes
│   │   ├── analytics/
│   │   ├── interviews/
│   │   ├── jobs/
│   │   ├── profiles/
│   │   └── session/  # Interview session
│   └── (public)/
├── components/
│   ├── ai-elements/  # AI-specific components
│   ├── basic/        # Basic UI components
│   └── ui/           # Shadcn UI components
├── apis/             # API clients
├── services/         # Frontend services
├── hooks/            # React hooks
├── store/            # State management
└── lib/              # Utilities
```

### AI Server (ai-server)

```
ai-server/src/
├── api/              # Route handlers
│   ├── agent.py      # Agent endpoints
│   ├── message.py    # Message endpoints
│   └── agent_config.py
├── services/         # Business logic
│   ├── chat_service.py
│   ├── question_generator.py
│   ├── evaluation_service.py
│   └── resume_agent.py
├── interviewer/
│   ├── graph.py      # LangChain graph (agent definition)
│   ├── models.py     # Agent state models
│   └── worker.py     # Background tasks
├── core/
│   ├── llm.py        # LLM setup
│   └── embeddings.py
└── main.py           # FastAPI app
```

---

## 6. Common Debugging Scenarios

### Issue: API returns 401 Unauthorized

**Check:**
1. Authentication middleware: `server/src/core/deps/auth.py`
2. Token validation in requests
3. Cookies are being sent: check browser dev tools → Application tab
4. Session not expired in DB

### Issue: Chat not saving to history

**Check:**
1. Session ID is being created: `server/src/services/session_service.py`
2. Chat messages are persisted: `server/src/api/message.py`
3. Message role is correct (user/assistant)
4. Database transaction commits

### Issue: AI responses are inconsistent

**Check:**
1. LLM configuration: `server/src/core/llm.py` and `ai-server/src/core/llm.py`
2. Prompt template: `ai-server/src/interviewer/graph.py`
3. Context being passed: check what profile/job data is sent
4. Model version in use: check API calls and model IDs

### Issue: Frontend not updating after API call

**Check:**
1. State management: `app/src/store/`
2. Component re-render: check dependencies in `useEffect`
3. API response handling: check `app/src/apis/`
4. Error handling: might silently fail

---

## 7. Testing & Validation

### Frontend (app)
```bash
cd app
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
```

### Backend (server)
```bash
cd server
pip install -r requirements.txt
uvicorn src.main:app --reload

# Migrations
alembic upgrade head
alembic revision --autogenerate -m "migration name"
```

### AI Server (ai-server)
```bash
cd ai-server
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

---

## 8. API Response Patterns

### Success Response (Backend)
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "field_error_code",
  "message": "Human-readable error message",
  "details": { /* optional */ }
}
```

### Chat Message Format
```json
{
  "id": "uuid",
  "session_id": "session-uuid",
  "role": "user|assistant",
  "content": "Message text",
  "metadata": {
    "timestamp": "2026-05-17T...",
    "tokens": 50
  }
}
```

---

## 9. Configuration & Environment

### Backend (.env or server environment)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/interviewer
REDIS_URL=redis://localhost:6379
CLAUDE_API_KEY=sk-...
AI_SERVER_URL=http://localhost:8001
```

### Frontend (.env.local or app environment)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_SERVER_URL=http://localhost:8001
```

### AI Server (.env)
```
CLAUDE_API_KEY=sk-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

---

## 10. Analysis Checklist

When investigating issues across services:

- [ ] **Is the issue in Frontend, Backend, or AI?** → Check where the data originates
- [ ] **What API endpoint is involved?** → Find the route and trace the service
- [ ] **Is database state involved?** → Check models and migrations
- [ ] **Is session/chat state involved?** → Check `session_id` flow
- [ ] **Are LLM calls involved?** → Check prompts and LLM configuration
- [ ] **Is this a data transformation issue?** → Trace from DB → API → Frontend
- [ ] **Are permissions involved?** → Check auth service and user context
- [ ] **Is there a race condition?** → Check async operations and locks
- [ ] **What changed recently?** → Use `git log` to find relevant commits

---

## 11. Quick Reference: Common Tasks

### Add a new field to profiles
1. `server/src/db/models/public/candidate_profile.py` — add field
2. `server/src/schemas/candidate_profile.py` — add to schema
3. `server/src/api/profile.py` — expose in API
4. `app/src/components/` — update form/display component

### Add a new API endpoint
1. Create route in `server/src/api/{feature}.py`
2. Create service in `server/src/services/{feature}_service.py`
3. Create schema in `server/src/schemas/{feature}.py`
4. Test endpoint manually (curl or Postman)
5. Create frontend client in `app/src/apis/{feature}.ts`
6. Use in component or hook

### Debug a specific chat session
1. Get session ID from URL: `app/src/app/(dashboard)/session/[id]/`
2. Query messages: `server/src/services/chat_service.py` → check DB
3. Check LLM calls in AI server: `ai-server/src/services/chat_service.py`
4. Trace prompt execution: `ai-server/src/interviewer/graph.py`

### Add a new LLM feature (tools, agents, etc.)
1. Update LLM initialization: `server/src/core/llm.py` or `ai-server/src/core/llm.py`
2. Update prompts: `ai-server/src/interviewer/graph.py`
3. Update agent state: `ai-server/src/interviewer/models.py`
4. Test with actual Claude API calls

### Implement real-time updates for a new field
1. **Backend:** Add SSE emit in MCP tool after `session.commit()`:
   ```python
   await _emit_profile_update(candidate.id, "field_name", {"field_name": candidate.field_name})
   ```
2. **Frontend:** Field auto-updates via existing `fillForm()` when SSE event arrives
3. **Test:** Edit profile, trigger AI update, watch resume preview refresh live

---

## 12. Performance Considerations

- **Database queries:** Check N+1 queries in services
- **API response size:** Large profiles/chats might need pagination
- **Embeddings:** Computing embeddings is expensive; cache when possible
- **LLM calls:** Each token costs money; optimize prompts and caching
- **Frontend state:** Large chat histories might slow down React rendering

---

## 13. Git & Code Organization

**Branch naming:** `fix/{issue}`, `feature/{feature}`, `refactor/{area}`

**Commit messages:** `[area] action: description`
- Examples: `[api] fix: handle null profiles in list endpoint`
- `[db] feat: add user preferences table`
- `[frontend] refactor: extract chat component logic`

**Pull requests:** Include affected services and testing instructions

---

## References

- Database models: `server/src/db/models/`
- API documentation: Check `/docs` endpoint on running server (Swagger)
- LangChain docs: https://python.langchain.com
- FastAPI: https://fastapi.tiangolo.com
- Next.js: https://nextjs.org
