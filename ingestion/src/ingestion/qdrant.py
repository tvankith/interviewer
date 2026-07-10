from functools import lru_cache

from qdrant_client import QdrantClient

from ingestion.config import CONFIG


@lru_cache
def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=CONFIG.RAG_QDRANT_URL, api_key=CONFIG.RAG_QDRANT_API_KEY)
