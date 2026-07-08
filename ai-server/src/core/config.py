import os
from dataclasses import dataclass
from functools import lru_cache


class ConfigError(RuntimeError):
    pass


def _get_env(key: str, default: str | None = None) -> str:
    value = os.getenv(key, default)
    if value is None or value.strip() == "":
        raise ConfigError(f"Missing required environment variable: {key}")
    return value.strip()


def _get_env_optional(key: str) -> str | None:
    value = os.getenv(key)
    if value is None or value.strip() == "":
        return None
    return value.strip()


@dataclass(frozen=True)
class Config:
    DATABASE_URL: str
    GOOGLE_API_KEY: str
    PORT: int
    FRONTEND_ORIGIN: str
    MCP_URL: str
    API_SERVER_URL: str
    LOG_LEVEL: str
    AI_SERVER_TOKEN_SECRET: str
    AI_SERVER_INTERNAL_SECRET: str
    LANGFUSE_PUBLIC_KEY: str | None
    LANGFUSE_SECRET_KEY: str | None
    LANGFUSE_BASE_URL: str
    RAG_QDRANT_URL: str
    RAG_QDRANT_API_KEY: str
    RAG_QDRANT_COLLECTION: str
    RAG_EMBEDDING_MODEL: str
    RAG_TOP_K: int

    @property
    def LANGFUSE_ENABLED(self) -> bool:
        # Opt-in and fail-open: observability is only turned on when both
        # keys are configured; the agent runs unchanged without them.
        return bool(self.LANGFUSE_PUBLIC_KEY and self.LANGFUSE_SECRET_KEY)


@lru_cache
def load_config() -> Config:
    return Config(
        DATABASE_URL=_get_env("AGENT_SERVER_DATABASE_URL"),
        GOOGLE_API_KEY=_get_env("GOOGLE_API_KEY"),
        PORT=int(_get_env("PORT")),
        FRONTEND_ORIGIN=_get_env("FRONTEND_ORIGIN"),
        MCP_URL=_get_env("MCP_URL"),
        API_SERVER_URL=_get_env("API_SERVER_URL"),
        LOG_LEVEL=_get_env("LOG_LEVEL"),
        AI_SERVER_TOKEN_SECRET=_get_env("AI_SERVER_TOKEN_SECRET"),
        AI_SERVER_INTERNAL_SECRET=_get_env("AI_SERVER_INTERNAL_SECRET"),
        # Langfuse stays opt-in: unset means observability is disabled, not misconfigured.
        LANGFUSE_PUBLIC_KEY=_get_env_optional("LANGFUSE_PUBLIC_KEY"),
        LANGFUSE_SECRET_KEY=_get_env_optional("LANGFUSE_SECRET_KEY"),
        LANGFUSE_BASE_URL=_get_env("LANGFUSE_BASE_URL"),
        RAG_QDRANT_URL=_get_env("RAG_QDRANT_URL"),
        RAG_QDRANT_API_KEY=_get_env("RAG_QDRANT_API_KEY"),
        RAG_QDRANT_COLLECTION=_get_env("RAG_QDRANT_COLLECTION", "resume_guidance"),
        RAG_EMBEDDING_MODEL=_get_env("RAG_EMBEDDING_MODEL", "models/gemini-embedding-001"),
        RAG_TOP_K=int(_get_env("RAG_TOP_K", "5")),
    )


CONFIG = load_config()
