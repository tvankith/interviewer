# Specs Overview

**All specs are located in `/specs` folder.** This document links to each spec and explains how to navigate them.

---

## 🧭 Quick Navigation

### Find What You Need

| Need | File | Location |
|------|------|----------|
| **MCP tools for resume data** | `RESUME-MCP-SPEC.md` | `/specs/` |
| **AI agent for writing resumes** | `RESUME-AGENT-SPEC.md` | `/specs/` |
| **Markdown notes feature** | `PROFILE-SPEC.md` | `/specs/` |
| **How services connect** | See [Integration & Data Flow](#integration--data-flow) | Below |

### Implementation Locations

| Service | Spec | Implementation |
|---------|------|-----------------|
| Resume MCP | `RESUME-MCP-SPEC.md` | `/server/src/mcp_server/resume.py` |
| Resume Agent | `RESUME-AGENT-SPEC.md` | `/ai-server/` |
| Profile Specs | `PROFILE-SPEC.md` | `/server/` (FastAPI) |

### By Task

- **Adding a new MCP tool?** → Read `RESUME-MCP-SPEC.md` (Core Tools section)
- **Building agent workflows?** → Read `RESUME-AGENT-SPEC.md` (Architecture & Workflow)
- **Creating profile notes UI?** → Read `PROFILE-SPEC.md` (API Endpoints, Frontend Integration)
- **Understanding data flow?** → See [Integration & Data Flow](#integration--data-flow)

---

## 📋 Spec Details

1. [Resume MCP Specification](#resume-mcp-specification)
2. [Resume Agent Specification](#resume-agent-specification)
3. [Profile Specs Feature](#profile-specs-feature)
4. [Integration & Data Flow](#integration--data-flow)

---

## Resume MCP Specification

**File**: `RESUME-MCP-SPEC.md`

### Overview
The **Resume Model Context Protocol (MCP)** is a FastMCP-based server that provides tools for managing candidate profiles and resume data. It serves as the data layer that enables AI agents to read, update, and manage resume information with real-time updates.

**Location**: `server/src/mcp_server/resume.py`

### Key Components
- **FastMCP Server** — HTTP server exposing MCP tools
- **Database Layer** — AsyncIO-based SQLAlchemy with PostgreSQL
- **Context Injection** — `@with_candidate` decorator for automatic candidate resolution
- **SSE Integration** — Real-time profile updates via Server-Sent Events
- **Type Safety** — Pydantic models for all request/response schemas

### Core Tools (11 Total)

#### Profile Information (2 tools)
- `get_candidate_profile` — Retrieve candidate profile data with optional field filtering
- `update_profile_info` — Update basic info (name, email, phone, location, summary, website, title)

#### Skills Management (2 tools)
- `update_skills` — Replace full skills list
- `add_skill` — Add single skill with duplicate prevention

#### Experience Management (2 tools)
- `update_experiences` — Replace all work experiences (auto-formats descriptions to HTML)
- `add_experience` — Add single work experience

#### Education Management (2 tools)
- `update_educations` — Replace all education entries
- `add_education` — Add single education entry

#### Projects Management (2 tools)
- `update_projects` — Replace all projects
- `add_project` — Add single project

#### Social Links Management (2 tools)
- `update_social_links` — Replace all social media links
- `add_social_link` — Add single social media link

#### Job Matching (1 tool)
- `get_target_role` — Retrieve associated job requirement/target role

### Data Model: `CandidateProfile`
```python
class CandidateProfile(Base):
    id: UUID
    name, email, phone, location, summary, website, title: str/Optional[str]
    skills: Optional[List[str]]
    links: Optional[List[Dict]]          # [{"url": str, "social_media": str}]
    experiences: Optional[List[Dict]]    # [{company, role, dates, desc, tech_stack}]
    projects: Optional[List[Dict]]       # [{name, description, tech_stack}]
    educations: Optional[List[Dict]]     # [{institute, course, dates, desc}]
    job_requirement: Optional[JobRequirement]  # FK to target role
```

### Real-Time Updates (SSE)
All profile mutations emit Server-Sent Events:
- `profile_info`, `skills`, `experiences`, `projects`, `educations`, `links`

### Context Resolution
Candidate identification via `request_context.meta['candidate_id']`:
1. Extract from HTTP request metadata (priority)
2. Fall back to `candidate_id` parameter
3. Return error if neither available

### Error Handling
| Error | Status | Resolution |
|-------|--------|-----------|
| Missing `candidate_id` | 400 | Ensure candidate_id in request metadata |
| Invalid UUID format | 400 | Validate UUID format |
| Profile not found | 404 | Verify candidate_id exists |
| Database error | 500 | Check PostgreSQL connection |

---

## Resume Agent Specification

**File**: `RESUME-AGENT-SPEC.md`

### Overview
The **Resume Agent** is a LangChain-powered AI service that helps candidates write, review, and improve their resume sections. It leverages the Resume MCP as its data layer.

### Stack
- **Framework**: LangChain
- **Memory**: LangChain + PostgreSQL checkpointer
- **Data Access**: Resume MCP (read/write operations)

### Skills (4 Core Competencies)
1. **Basic Info** — Write/Review name, title, email, phone, location, website, summary
2. **Summary** — Write/Review professional summary/bio
3. **Experience** — Write/Review work experiences
4. **Education** — Write/Review education entries

### Tools
- **Resume MCP** — All 11 tools available for read/write operations on basic info, summary, experience, and education

### Architecture & Workflow

The Resume Agent operates as an **Organizer + Specialist** model:

1. **Organizer Agent** — Routes candidate requests to appropriate sub-agents
2. **Resume Writer Agent** — Proposes changes via MCP tools (without committing)
3. **General Agent** — Queries profile for context
4. **Change Batching** — Collects proposed updates and commits to database

### Memory & State
- Uses LangChain's PostgreSQL checkpointer for conversation state
- Maintains chat history per session
- Tracks changes for multi-turn interactions

---

## Profile Specs Feature

**File**: `PROFILE-SPEC.md`

### Overview
**Profile Specs** enables candidates to save personal preferences, stories, rules, and notes as named markdown files attached to their candidate profile. This provides flexible, unstructured metadata separate from the structured resume data.

**Purpose**:
- Store interview preparation notes (STAR examples, strengths/weaknesses)
- Document personal preferences (salary, work culture, location)
- Organize unstructured profile metadata
- Keep notes separate from structured resume/profile data

### Stack
- **Database**: PostgreSQL (via Supabase)
- **ORM**: SQLAlchemy 2.0+ with async/await
- **API**: FastAPI
- **Request/Response**: Pydantic v2

### Data Model: `profile_spec` Table
```sql
CREATE TABLE profile_spec (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id UUID NOT NULL REFERENCES candidate_profile(id),
  name VARCHAR NOT NULL,
  content TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(candidate_profile_id, name)  -- No duplicate names per profile
);
```

**Key Features**:
- **Soft Delete** — `deleted_at` column tracks deletion
- **Timestamps** — Auto-set `created_at`, tracked `updated_at`
- **Unique Names** — Composite index prevents duplicate spec names per profile
- **Cascade Delete** — Specs deleted when profile is deleted

### API Endpoints (Base: `/api/profile-spec`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/{profile_id}` | Create new spec |
| GET | `/{profile_id}` | List all specs for profile |
| GET | `/{profile_id}/{spec_id}` | Get single spec |
| PATCH | `/{profile_id}/{spec_id}` | Update spec name/content |
| DELETE | `/{profile_id}/{spec_id}` | Soft delete spec |

### Error Handling
- `409 Conflict` — Spec with this name already exists
- `404 Not Found` — Profile or spec not found
- `400 Bad Request` — Invalid input data

### Frontend Integration Needs
1. **Spec List View** — Display all specs with create/edit/delete actions
2. **Spec Editor** — Markdown editor with name input and preview
3. **Spec Viewer** — Render markdown with metadata display

---

## Integration & Data Flow

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│  - Resume Editor UI                                         │
│  - Profile Spec Manager (Markdown Editor)                   │
│  - Interview Session UI                                     │
└─────────────────┬───────────────────────────┬───────────────┘
                  │                           │
         ┌────────▼────────┐        ┌────────▼────────┐
         │ Server (FastAPI) │        │ AI Server      │
         │ - User Auth     │◄───────│ (LangChain)    │
         │ - Resume MCP    │        │ - Resume Agent │
         │ - Profile Spec  │        │ - Chat History │
         │ - Job Matching  │        │ - Agent Memory │
         └────────┬────────┘        └────────┬────────┘
                  │                           │
                  └─────────────┬─────────────┘
                                │
                      ┌─────────▼──────────┐
                      │   PostgreSQL       │
                      │  - CandidateProfile│
                      │  - ProfileSpec     │
                      │  - JobRequirement  │
                      │  - ChatHistory     │
                      └────────────────────┘
```

### Data Flow: Resume Editing

```
User Request (Edit Resume)
        ↓
Resume Agent (ai-server)
        ↓
Proposes Changes (LangChain)
        ↓
Resume MCP (server)
  - get_candidate_profile (read context)
  - add_experience, update_skills, etc. (propose)
        ↓
Database (PostgreSQL)
        ↓
SSE Emission (Real-time Updates)
        ↓
Frontend (Real-time UI Update)
```

### Data Flow: Profile Spec Management

```
User Action (Create/Edit/Delete Spec)
        ↓
Frontend (/api/profile-spec endpoints)
        ↓
Backend (ProfileSpecService)
  - Validate name uniqueness
  - Handle soft delete
  - Set timestamps
        ↓
Database (PostgreSQL)
        ↓
Response to Frontend (Pydantic DTO)
        ↓
Frontend (List/Edit UI Update)
```

### Service Dependencies

**Resume MCP depends on**:
- PostgreSQL (CandidateProfile table)
- Context injection (candidate_id from request)
- SSE for real-time updates

**Resume Agent depends on**:
- Resume MCP (for all read/write operations)
- LangChain (for agent logic and memory)
- PostgreSQL (for conversation checkpoints)
- Claude AI (via LangChain)

**Profile Specs depends on**:
- PostgreSQL (profile_spec table)
- FastAPI (endpoints)
- Pydantic (validation)

### Shared Data Model

All three specs operate on extensions of the `CandidateProfile`:

```
CandidateProfile
├── Resume Fields (managed by Resume MCP)
│   ├── Basic Info (name, email, title, etc.)
│   ├── Summary
│   ├── Skills
│   ├── Experiences
│   ├── Educations
│   ├── Projects
│   └── Social Links
│
├── Job Matching (managed by Resume MCP)
│   └── job_requirement (FK to JobRequirement)
│
└── Notes & Preferences (managed by Profile Specs)
    └── Specs (STAR stories, preferences, rules)
```

---

## Summary Table

| Spec | Purpose | Stack | Primary Entity | API Pattern |
|------|---------|-------|----------------|-------------|
| **Resume MCP** | Read/write resume data; real-time updates | FastMCP, SQLAlchemy, PostgreSQL | CandidateProfile | 11 MCP tools |
| **Resume Agent** | AI-powered resume writing/review | LangChain, Claude, PostgreSQL | Agent State | Chat API + MCP |
| **Profile Specs** | Store markdown notes/preferences | FastAPI, SQLAlchemy, Pydantic | ProfileSpec | REST (CRUD) |

---

## Key Takeaways

1. **Separation of Concerns**:
   - Resume MCP handles structured resume data
   - Profile Specs handles unstructured user notes
   - Resume Agent orchestrates both for AI-powered editing

2. **Real-Time Updates**:
   - Resume MCP emits SSE events for profile changes
   - Frontend subscribes to live updates
   - No polling needed

3. **Type Safety**:
   - Pydantic schemas for all request/response validation
   - SQLAlchemy ORM for database operations
   - FastMCP for MCP tool definition

4. **Multi-Agent Architecture**:
   - Organizer Agent routes requests
   - Specialist Agents (Resume Writer, General) execute tasks
   - Centralized data access via Resume MCP

5. **Database Integrity**:
   - Foreign keys ensure referential integrity
   - Unique constraints prevent data conflicts
   - Soft deletes preserve audit trails
   - Async operations prevent connection exhaustion
