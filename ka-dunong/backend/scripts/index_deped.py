from __future__ import annotations

import mimetypes
import sys
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config import Settings
from app.services.rag.chunker import DocumentChunker
from app.services.rag.embeddings import EmbeddingService
from app.services.rag.extractors import DocumentExtractor
from app.services.rag.vector_store import QdrantVectorStore


SUPPORTED_EXTENSIONS = {".pdf", ".docx"}


def main() -> None:
    settings = Settings()
    knowledge_dir = settings.deped_knowledge_dir
    knowledge_dir.mkdir(parents=True, exist_ok=True)
    print(f"Qdrant storage directory: {settings.qdrant_dir}")
    print(f"Qdrant collection: {settings.rag_qdrant_collection}\n")

    extractor = DocumentExtractor(settings)
    chunker = DocumentChunker(settings)
    embeddings = EmbeddingService(settings)
    vector_store = QdrantVectorStore(settings, embeddings.dimension)

    documents = sorted(
        path
        for path in knowledge_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    indexed_documents = 0
    stored_chunks = 0

    for path in documents:
        relative_path = path.relative_to(knowledge_dir).as_posix()
        print(f"Indexing {relative_path}...")

        try:
            chunk_count = index_document(
                path=path,
                relative_path=relative_path,
                extractor=extractor,
                chunker=chunker,
                embeddings=embeddings,
                vector_store=vector_store,
            )
        except Exception as error:
            print(f"x Failed: {error}")
            continue

        indexed_documents += 1
        stored_chunks += chunk_count
        print(f"\u2713 {chunk_count} chunks indexed\n")

    print("Done.")
    print(f"{indexed_documents} documents indexed.")
    print(f"{stored_chunks} chunks stored.")


def index_document(
    *,
    path: Path,
    relative_path: str,
    extractor: DocumentExtractor,
    chunker: DocumentChunker,
    embeddings: EmbeddingService,
    vector_store: QdrantVectorStore,
) -> int:
    subject, grade_level = infer_metadata(relative_path)
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"deped:{relative_path}"))
    extraction = extractor.extract(path, path.name, mime_type)

    chunks = chunker.chunk(
        document_id=document_id,
        filename=path.name,
        mime_type=extraction.mime_type,
        blocks=extraction.blocks,
        source="deped",
        student_id=None,
        relative_path=relative_path,
        subject=subject,
        grade_level=grade_level,
    )
    if not chunks:
        return 0

    vectors = embeddings.embed_texts([chunk.text for chunk in chunks])
    vector_store.upsert_chunks(chunks, vectors)
    return len(chunks)


def infer_metadata(relative_path: str) -> tuple[str | None, str | None]:
    parts = Path(relative_path).parts[:-1]
    grade_level = None
    subject = None

    for index, part in enumerate(parts):
        normalized = part.replace("_", " ").replace("-", " ").strip()
        compact = normalized.replace(" ", "").lower()

        if grade_level is None and compact.startswith("grade"):
            grade_suffix = compact.removeprefix("grade")
            grade_level = f"Grade {grade_suffix}" if grade_suffix else normalized
            if index + 1 < len(parts):
                subject = clean_subject(parts[index + 1])
            break

    if subject is None and parts:
        subject = clean_subject(parts[-1])

    return subject, grade_level


def clean_subject(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").strip()


if __name__ == "__main__":
    main()
