from dataclasses import dataclass

from langchain_text_splitters import MarkdownHeaderTextSplitter

from ingestion.loader import Document

# Splits each corpus doc on markdown headings ("#" and "##") so each section
# (heading + body) becomes its own chunk. Headers are kept in the chunk text
# (not stripped into metadata-only) so each chunk stays self-describing.
_HEADERS_TO_SPLIT_ON = [("#", "h1"), ("##", "h2")]
_SPLITTER = MarkdownHeaderTextSplitter(headers_to_split_on=_HEADERS_TO_SPLIT_ON, strip_headers=False)


@dataclass(frozen=True)
class Chunk:
    source_doc: str
    chunk_index: int
    text: str
    section: str


def chunk_document(document: Document) -> list[Chunk]:
    text = document.text.strip()
    if not text:
        return []

    splits = _SPLITTER.split_text(document.text)
    if not splits:
        return [Chunk(source_doc=document.source_doc, chunk_index=0, text=text, section="general")]

    chunks = []
    for split in splits:
        section_text = split.page_content.strip()
        if not section_text:
            continue
        section_title = (split.metadata.get("h2") or split.metadata.get("h1") or "general").strip().lower()
        chunks.append(
            Chunk(
                source_doc=document.source_doc,
                chunk_index=len(chunks),
                text=section_text,
                section=section_title,
            )
        )
    return chunks


def chunk_documents(documents: list[Document]) -> list[Chunk]:
    chunks = []
    for document in documents:
        chunks.extend(chunk_document(document))
    return chunks
