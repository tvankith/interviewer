from functools import lru_cache

import numpy as np
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from ingestion.config import CONFIG

# Must match ai-server/src/rag/embeddings.py's normalization and dimension —
# see design.md Decision 2. Truncated dims aren't pre-normalized by the API,
# so both sides L2-normalize independently before use.
EMBEDDING_DIMENSIONS = 768


@lru_cache
def _get_embeddings_client() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=CONFIG.RAG_EMBEDDING_MODEL,
        google_api_key=CONFIG.GOOGLE_API_KEY,
    )


def embed_documents(texts: list[str]) -> list[list[float]]:
    vectors = _get_embeddings_client().embed_documents(
        texts,
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=EMBEDDING_DIMENSIONS,
    )
    normalized = []
    for vector in vectors:
        array = np.array(vector)
        normalized.append((array / np.linalg.norm(array)).tolist())
    return normalized
