FROM python:3.12-slim AS base

WORKDIR /app

RUN pip install uv

# Precompile all dependencies to .pyc at build time — langchain/langgraph's
# import graph is large, and paying the compile cost once here instead of on
# every container boot noticeably speeds up cold start.
ENV UV_COMPILE_BYTECODE=1

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Dev stage — source is mounted as a volume
FROM base AS dev

ENV PYTHONPATH=/app/src

EXPOSE 3004

CMD ["uv", "run", "--no-sync", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3004", "--reload", "--app-dir", "src"]

# Prod stage
FROM base AS prod

COPY src ./src

ENV PYTHONPATH=/app/src

# Non-secret Langfuse config, baked in at build time instead of injected by
# Cloud Run — see .github/workflows/deploy-ai-server.yml for the build-args.
ARG LANGFUSE_PUBLIC_KEY=""
ARG LANGFUSE_BASE_URL="https://cloud.langfuse.com"
ENV LANGFUSE_PUBLIC_KEY=${LANGFUSE_PUBLIC_KEY}
ENV LANGFUSE_BASE_URL=${LANGFUSE_BASE_URL}

EXPOSE 8080

CMD ["sh", "-c", "uv run --no-sync uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --app-dir src"]
