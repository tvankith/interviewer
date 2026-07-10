import logging
import uuid

from qdrant_client.models import PointStruct

from ingestion.chunker import Chunk, chunk_documents
from ingestion.config import CONFIG
from ingestion.embeddings import embed_documents
from ingestion.loader import load_corpus
from ingestion.qdrant import get_qdrant_client

logger = logging.getLogger(__name__)


def _point_id(chunk: Chunk) -> str:
    # Deterministic per source_doc + chunk_index so re-running ingestion after
    # editing a doc overwrites that doc's points instead of duplicating them.
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{chunk.source_doc}:{chunk.chunk_index}"))


def run_pipeline() -> int:
    documents = load_corpus()
    chunks = chunk_documents(documents)
    if not chunks:
        logger.warning("No corpus chunks found under ingestion/src/ingestion/corpus/ — nothing to ingest")
        return 0

    vectors = embed_documents([chunk.text for chunk in chunks])

    points = [
        PointStruct(
            id=_point_id(chunk),
            vector=vector,
            payload={"text": chunk.text, "source_doc": chunk.source_doc, "section": chunk.section},
        )
        for chunk, vector in zip(chunks, vectors)
    ]

    get_qdrant_client().upsert(collection_name=CONFIG.RAG_QDRANT_COLLECTION, points=points)
    logger.info("Upserted %d chunk(s) into Qdrant collection %s", len(points), CONFIG.RAG_QDRANT_COLLECTION)
    return len(points)
