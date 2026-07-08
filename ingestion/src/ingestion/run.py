import argparse
import logging

from qdrant_client.models import Distance, VectorParams

from ingestion.config import CONFIG
from ingestion.embeddings import EMBEDDING_DIMENSIONS
from ingestion.pipeline import run_pipeline
from ingestion.qdrant import get_qdrant_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _ensure_collection(recreate: bool) -> None:
    client = get_qdrant_client()
    exists = client.collection_exists(CONFIG.RAG_QDRANT_COLLECTION)

    if recreate and exists:
        logger.info("Dropping existing collection %s", CONFIG.RAG_QDRANT_COLLECTION)
        client.delete_collection(CONFIG.RAG_QDRANT_COLLECTION)
        exists = False

    if not exists:
        logger.info("Creating collection %s (%d dims, cosine)", CONFIG.RAG_QDRANT_COLLECTION, EMBEDDING_DIMENSIONS)
        client.create_collection(
            collection_name=CONFIG.RAG_QDRANT_COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIMENSIONS, distance=Distance.COSINE),
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Chunk, embed, and upsert the resume-writing guidance corpus into Qdrant."
    )
    parser.add_argument(
        "--recreate-collection",
        action="store_true",
        help="Drop and recreate the Qdrant collection before ingesting.",
    )
    args = parser.parse_args()

    _ensure_collection(recreate=args.recreate_collection)
    count = run_pipeline()
    logger.info("Ingestion complete: %d chunk(s) upserted", count)


if __name__ == "__main__":
    main()
