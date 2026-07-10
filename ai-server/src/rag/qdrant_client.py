from functools import lru_cache

from qdrant_client import QdrantClient

from rag.config import RAG_CONFIG


@lru_cache
def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=RAG_CONFIG.QDRANT_URL, api_key=RAG_CONFIG.QDRANT_API_KEY)
