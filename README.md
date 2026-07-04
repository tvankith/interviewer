# interviewer

## Quick Start (Docker)

Run the full stack — `app`, `api-server`, `agent-server`, and PostgreSQL — with a single command.

**Prerequisites:** Docker Desktop (or Docker Engine + Compose plugin)

```bash
# 1. Create .env from the template
make docker-env

# 2. Fill in your secrets (POSTGRES_PASSWORD, SUPABASE_*, GOOGLE_API_KEY)
nano .env

# 3. Start all services (detached)
make docker-up

# 4. Open the app
open http://localhost:3000
```

| Service | URL |
|---------|-----|
| app (Next.js) | http://localhost:3000 |
| api-server | http://localhost:3002/documentation |
| agent-server | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

```bash
make docker-logs    # tail all logs
make docker-down    # stop (data preserved)
make docker-clean   # stop + delete volumes (data lost)
```

See [ENV_SETUP.md](./ENV_SETUP.md) for full env variable documentation.
