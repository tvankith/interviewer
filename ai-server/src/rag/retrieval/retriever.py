import logging

from rag.config import RAG_CONFIG
from rag.embeddings import embed_query
from rag.qdrant_client import get_qdrant_client

logger = logging.getLogger(__name__)

NO_GUIDANCE_FOUND = "No guidance found."


def retrieve(query: str, top_k: int = RAG_CONFIG.TOP_K) -> list[str]:
    vector = embed_query(query)
    response = get_qdrant_client().query_points(
        collection_name=RAG_CONFIG.QDRANT_COLLECTION,
        query=vector,
        limit=top_k,
    )

    if not response.points:
        logger.warning("No resume guidance found for query: %r", query)
        return [NO_GUIDANCE_FOUND]

    return [point.payload["text"] for point in response.points]
