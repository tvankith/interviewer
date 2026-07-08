import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# ingestion is a standalone project with no access to ai-server's config
# module, so it loads the same repo-root .env directly rather than sharing
# any config code (see design.md Decision 1 / 6).
load_dotenv(Path(__file__).resolve().parents[3] / ".env")


class ConfigError(RuntimeError):
    pass


def _get_env(key: str, default: str | None = None) -> str:
    value = os.getenv(key, default)
    if value is None or value.strip() == "":
        raise ConfigError(f"Missing required environment variable: {key}")
    return value.strip()


@dataclass(frozen=True)
class Config:
    GOOGLE_API_KEY: str
    RAG_QDRANT_URL: str
    RAG_QDRANT_API_KEY: str
    RAG_QDRANT_COLLECTION: str
    RAG_EMBEDDING_MODEL: str


@lru_cache
def load_config() -> Config:
    return Config(
        GOOGLE_API_KEY=_get_env("GOOGLE_API_KEY"),
        RAG_QDRANT_URL=_get_env("RAG_QDRANT_URL"),
        RAG_QDRANT_API_KEY=_get_env("RAG_QDRANT_API_KEY"),
        RAG_QDRANT_COLLECTION=_get_env("RAG_QDRANT_COLLECTION", "resume_guidance"),
        RAG_EMBEDDING_MODEL=_get_env("RAG_EMBEDDING_MODEL", "models/gemini-embedding-001"),
    )


CONFIG = load_config()
