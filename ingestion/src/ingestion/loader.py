from dataclasses import dataclass
from pathlib import Path

CORPUS_DIR = Path(__file__).resolve().parent / "corpus"


@dataclass(frozen=True)
class Document:
    source_doc: str
    text: str


def load_corpus() -> list[Document]:
    return [
        Document(source_doc=path.name, text=path.read_text())
        for path in sorted(CORPUS_DIR.glob("*.md"))
    ]
