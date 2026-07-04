# Environment Setup Guide

This guide explains how to set up and manage environment variables in the monorepo.

## Quick Start

```bash
# 1. Create .env files from templates
make env-setup

# 2. Edit .env.local with your local values
nano .env.local

# 3. Check environment configuration
make env-check

# 4. Start development
make install
make dev-app &
make dev-server &
```

## File Structure

```
repo/
├── .env.example              # Root template (checked in)
├── .env.local               # Local overrides (git-ignored) - NEVER COMMIT
├── Makefile                 # Loads .env.local or .env automatically
│
├── app/
│   ├── .env.example         # Frontend template
│   └── .env.local          # Frontend local overrides (git-ignored)
│
├── server/
│   ├── .env.example        # Backend template
│   └── .env.local          # Backend local overrides (git-ignored)
│
├── agent-server/
│   ├── .env.example        # Agent template
│   └── .env.local          # Agent local overrides (git-ignored)
│
└── ai-server/
    ├── .env.example        # AI server template
    └── .env.local          # AI server local overrides (git-ignored)
```

## Load Order & Precedence

Environment variables are loaded in this order (highest to lowest priority):

1. **System environment variables** (e.g., `export VAR=value`)
2. **Service .env.local** (e.g., `app/.env.local`)
3. **Service .env** (e.g., `app/.env`)
4. **Root .env.local**
5. **Root .env**
6. **Root .env.example** (template only)

**Example:** If `DATABASE_URL` is set in both root `.env.local` and `server/.env.local`, the service-level value takes precedence.

## Root Environment Variables

Edit `.env.local` with values used across all services:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/interviewer
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d

# AI Services
ANTHROPIC_API_KEY=sk-ant-your-key-here
GEMINI_API_KEY=your-gemini-key-here

# Service Ports
SERVER_PORT=8001
AGENT_SERVER_PORT=8000
AI_SERVER_PORT=8002

# Frontend URLs
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_AGENT_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Interviewer

# Logging
LOG_LEVEL=debug
DEBUG=false
```

## Service-Specific Overrides

### Frontend (app/.env.local)

```bash
# Override API URLs for testing
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_AGENT_URL=http://localhost:9001
```

### Backend (server/.env.local)

```bash
# Override port for testing
SERVER_PORT=9001
LOG_LEVEL=info
```

### Agent Server (agent-server/.env.local)

```bash
# Override port
AGENT_SERVER_PORT=9000
```

### AI Server (ai-server/.env.local)

```bash
# Override port
AI_SERVER_PORT=9002
```

## Python Services

Python services load environment variables using Pydantic Settings.

### Example: server/config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    server_port: int = 8001
    jwt_secret: str

    class Config:
        env_file = '.env.local'
        case_sensitive = False

settings = Settings()
```

### Usage in Python code:

```python
from config import settings

db_url = settings.database_url
port = settings.server_port
```

## Node.js Services

Next.js automatically loads environment variables from `.env.local` and `.env`.

### Frontend Variables (Next.js)

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8001  # Available client-side
ANTHROPIC_API_KEY=secret                    # Server-side only
```

### Usage in Next.js:

```javascript
// Client-side (only NEXT_PUBLIC_* vars)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server-side (all vars available)
const secret = process.env.ANTHROPIC_API_KEY;
```

## Development Workflow

### First Time Setup

```bash
# 1. Create local env files
make env-setup

# 2. Edit with your values
nano .env.local
nano app/.env.local
nano server/.env.local

# 3. Install dependencies
make install

# 4. Check configuration
make env-check
```

### Daily Development

```bash
# Start services (each in separate terminal)
make dev-app &
make dev-server &
make dev-agent &
make dev-ai &

# Check which env is loaded
make env-check
```

### Changing Configuration

Edit `.env.local` and restart services:

```bash
# Kill running services
pkill -f "npm run dev"
pkill -f "python -m uvicorn"

# Edit config
nano .env.local

# Restart
make dev-app &
make dev-server &
```

## Production Deployment

**NEVER commit `.env.local` or production secrets to git.**

Instead, inject environment variables at runtime:

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
      - run: npm run deploy
```

### Docker

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
ENV NODE_ENV=production
RUN npm install
CMD ["npm", "start"]
```

```bash
# Run with environment variables injected
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="secret" \
  -e ANTHROPIC_API_KEY="key" \
  my-app:latest
```

### Vercel

```bash
# Add secrets to Vercel
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ANTHROPIC_API_KEY

# Deploy
vercel deploy
```

## Docker Compose Environment Management

Docker Compose automatically reads a single `.env` file from the project root. All variables are defined there and injected into each service via the `environment:` blocks in `docker-compose.yml`.

### File Structure

```
repo/
├── .env.example   # Template (committed — safe to share)
└── .env           # Your local values (git-ignored — never commit)
```

That's it. No per-service files.

### How It Works

`docker-compose.yml` uses `${VAR}` interpolation to build each service's environment:

```yaml
# Compose reads .env automatically, then substitutes ${} references:
api-server:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/api_server_database
    JWT_SECRET: ${JWT_SECRET}
```

### First-Time Setup

```bash
make docker-env   # copies .env.example → .env
nano .env         # fill in POSTGRES_PASSWORD, SUPABASE_*, GOOGLE_API_KEY
make docker-up
```

### Difference from Native Dev (`.env.local`)

| Concern | Native dev | Docker Compose |
|---------|-----------|----------------|
| File name | `.env.local` | `.env` |
| Database host | `localhost:5432` | `postgres:5432` (Docker service name) |
| Inter-service URLs | `localhost:PORT` | Docker hostnames (`http://api-server:3002`) |
| Loaded by | Node.js / dotenv automatically | Docker Compose automatically |

### node_modules volumes & dependency changes

Each Node service (`api-server`, `agent-server`, `app`) mounts a
named volume over `/app/node_modules` (see `docker-compose.yml`). This keeps the
container using its own Linux-built dependencies (Prisma engines, native modules)
instead of whatever is on the host.

A named volume is **only populated from the image the first time it's created** —
Docker never re-copies into an existing volume, even after you rebuild. So when
`package.json` changes, a plain rebuild leaves the volume stale and you get errors
like `ERR_MODULE_NOT_FOUND` for the newly added package.

To prevent drift, each service's **dev `CMD` runs `npm install` (and `prisma
generate`) on startup**, so the volume self-heals on every `docker compose up`.
`npm install` is near-instant when already in sync and installs only what's missing.

If a volume is ever badly out of sync and you want a clean slate:

```bash
docker compose rm -sf <service>
docker volume rm <project>_<service>_node_modules   # e.g. project_resume_agent_node_modules
docker compose up -d --build <service>
```

## Security Best Practices

- ✅ **Do:**
  - Commit `.env.example` (template)
  - Add `.env.local` to `.gitignore`
  - Use secrets manager for production
  - Rotate secrets regularly
  - Validate required vars on startup

- ❌ **Don't:**
  - Commit `.env.local` or secrets
  - Log sensitive variables
  - Expose secrets in error messages
  - Use same secret in dev and prod
  - Share `.env.local` files

## Troubleshooting

### Variables not loading

```bash
# Check what's loaded
make env-check

# Verify .env.local exists
ls -la .env.local

# Verify service can read env
cd server && . venv/bin/activate && python -c "from config import settings; print(settings.database_url)"
```

### Port already in use

Change port in `.env.local`:

```bash
SERVER_PORT=9001
AGENT_SERVER_PORT=9000
AI_SERVER_PORT=9002
```

Then restart services.

### Database connection fails

Verify `DATABASE_URL` is correct:

```bash
# Check configured URL
grep DATABASE_URL .env.local

# Test connection
psql postgresql://user:pass@localhost:5432/interviewer
```

## Common Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | Required | PostgreSQL connection string |
| `REDIS_URL` | redis://localhost:6379 | Redis cache |
| `JWT_SECRET` | Required | JWT signing key |
| `SERVER_PORT` | 8001 | Python backend port |
| `AGENT_SERVER_PORT` | 8000 | Agent server port |
| `AI_SERVER_PORT` | 8002 | AI server port |
| `NEXT_PUBLIC_API_URL` | http://localhost:8001 | Frontend API endpoint |
| `LOG_LEVEL` | debug | Logging level (debug/info/warn/error) |
| `ANTHROPIC_API_KEY` | Optional | Claude API key |
| `GEMINI_API_KEY` | Optional | Google Gemini API key |
| `LANGFUSE_PUBLIC_KEY` | Optional | Langfuse Cloud public key (ai-server observability) |
| `LANGFUSE_SECRET_KEY` | Optional | Langfuse Cloud secret key (ai-server observability) |
| `LANGFUSE_BASEURL` | https://cloud.langfuse.com | Langfuse endpoint (override for EU/self-hosted) |
| `LANGFUSE_BASE_URL` | https://cloud.langfuse.com | Langfuse endpoint read by **ai-server**'s Python SDK (same purpose, different var name — SDK convention differs by language) |

## Support

For issues with environment setup, check:
1. `.env.local` exists and has correct format
2. All required variables are set
3. File permissions are correct (`-rw-r--r--`)
4. No trailing spaces in variable values
5. Database and Redis services are running

Run `make env-check` to verify setup.
