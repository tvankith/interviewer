# Project Structure

Each service maintains its own specification under `.claude/`.

## 🗺️ Navigation

**Start here for your task:**
- **[Architecture & Development Guide](./ARCHITECTURE-AND-DEVELOPMENT-GUIDE.md)** — For bug fixes, features, and cross-service analysis (recommended)
- **[Monorepo Structure](./MONO-REPO-STRUCTURE.md)** — Quick overview of services and data flow

## Services

| Service | Spec | Purpose |
|---------|------|---------|
| **app** | [app/.claude/](../app/.claude/) | Frontend (Next.js, React, TypeScript) |
| **server** | [server/.claude/](../server/.claude/) | Backend (FastAPI, Python, PostgreSQL) |
| **ai-server** | [ai-server/.claude/](../ai-server/.claude/) | Agent (LangChain, Claude AI, conversations) |
| **serverless** | [serverless/.claude/](../serverless/.claude/) | Deployment configuration |

## Service-Level Documentation

Each service has its own `.claude/` directory with:
- **CLAUDE.md** — Quick reference and directory structure
- **PATTERNS.md** — Code patterns, templates, and examples for adding new features (START HERE when coding)

| Service | CLAUDE.md | PATTERNS.md |
|---------|-----------|-------------|
| **app** | [app/.claude/CLAUDE.md](../app/.claude/CLAUDE.md) | [app/.claude/PATTERNS.md](../app/.claude/PATTERNS.md) |
| **server** | [server/.claude/CLAUDE.md](../server/.claude/CLAUDE.md) | [server/.claude/PATTERNS.md](../server/.claude/PATTERNS.md) |
| **ai-server** | [ai-server/.claude/CLAUDE.md](../ai-server/.claude/CLAUDE.md) | [ai-server/.claude/PATTERNS.md](../ai-server/.claude/PATTERNS.md) |

---

**For debugging, features, or analysis → [Architecture & Development Guide](./ARCHITECTURE-AND-DEVELOPMENT-GUIDE.md)**

# How To Start

## Product Overview

This is an AI-powered interview platform with two main features:

1. **AI Interviewer** — Conduct technical interviews with an AI agent powered by LangChain and Claude
2. **Resume/Profile Editor** — Users can create and manage their professional profiles

## Architecture

The application is a monorepo with three main services:

- **Frontend** (`/app`) — Next.js application for users to interact with interviews and profiles
- **Backend** (`/server`) — FastAPI server handling authentication, user data, and resume management
- **AI Server** (`/ai-server`) — LangChain-powered agent managing interview conversations and chat history

## Quick Start

### Prerequisites
Before starting, ensure you have:
- Node.js (for `/app`)
- Python 3.9+ (for `/server` and `/ai-server`)
- PostgreSQL (database for backend)
- Environment variables configured in each service

### Running Services Locally

1. **Frontend** (`/app`)
   ```bash
   cd app
   npm install
   npm run dev
   ```
   Runs on `http://localhost:3000`

2. **Backend** (`/server`)
   ```bash
   cd server
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   python -m uvicorn main:app --reload
   ```

3. **AI Server** (`/ai-server`)
   ```bash
   cd ai-server
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python -m uvicorn main:app --reload --port 8001
   ```

## Before Starting Development

For new features, bug fixes, or architecture changes:
- **Clarify requirements** — Understand the task scope and dependencies across services
- **Plan before coding** — Ask questions or review [Architecture & Development Guide](./ARCHITECTURE-AND-DEVELOPMENT-GUIDE.md) if unclear
- **Reference service specs** — Check service-level CLAUDE.md files for specific implementation details