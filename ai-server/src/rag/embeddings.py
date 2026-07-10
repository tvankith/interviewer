from functools import lru_cache

import numpy as np
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from core.config import CONFIG
from rag.config import RAG_CONFIG

# Embedding dimensions below the model's native 3072 aren't pre-normalized by
# the API (see design.md Decision 2), so vectors are L2-normalized here
# before use — this must match the normalization ingestion applies to
# document vectors at upsert time, even though the two are separate
# implementations (Decision 1: no shared code between ai-server and
# ingestion).
EMBEDDING_DIMENSIONS = 768


@lru_cache
def _get_embeddings_client() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=RAG_CONFIG.EMBEDDING_MODEL,
        google_api_key=CONFIG.GOOGLE_API_KEY,
    )


def embed_query(text: str) -> list[float]:
    vector = _get_embeddings_client().embed_query(
        text,
        task_type="RETRIEVAL_QUERY",
        output_dimensionality=EMBEDDING_DIMENSIONS,
    )
    array = np.array(vector)
    normalized = array / np.linalg.norm(array)
    return normalized.tolist()
