from qdrant_client import QdrantClient, models

from app.config import Settings
from app.models import Source
from app.services.rag.types import DocumentChunk


class QdrantVectorStore:
    def __init__(self, settings: Settings, vector_size: int):
        settings.qdrant_dir.mkdir(parents=True, exist_ok=True)
        self.collection_name = settings.rag_qdrant_collection
        self.client = QdrantClient(path=str(settings.qdrant_dir))
        self._ensure_collection(vector_size)

    def upsert_chunks(self, chunks: list[DocumentChunk], vectors: list[list[float]]) -> None:
        points = [
            models.PointStruct(
                id=chunk.id,
                vector=vector,
                payload={
                    "student_id": chunk.student_id,
                    "document_id": chunk.document_id,
                    "filename": chunk.filename,
                    "mime_type": chunk.mime_type,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "subject": chunk.subject,
                    "grade_level": chunk.grade_level,
                    "ocr_used": chunk.ocr_used,
                    "text": chunk.text,
                },
            )
            for chunk, vector in zip(chunks, vectors, strict=True)
        ]
        self.client.upsert(collection_name=self.collection_name, points=points)

    def search(
        self,
        *,
        student_id: str,
        query_vector: list[float],
        top_k: int,
        document_ids: list[str] | None = None,
    ) -> list[Source]:
        filters = [
            models.FieldCondition(
                key="student_id",
                match=models.MatchValue(value=student_id),
            )
        ]
        if document_ids:
            filters.append(
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchAny(any=document_ids),
                )
            )

        hits = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=models.Filter(must=filters),
            limit=max(1, top_k),
        )

        sources: list[Source] = []
        for hit in hits:
            payload = hit.payload or {}
            sources.append(
                Source(
                    document_id=str(payload.get("document_id", "")),
                    filename=str(payload.get("filename", "")),
                    page_number=payload.get("page_number"),
                    chunk_index=int(payload.get("chunk_index", 0)),
                    score=float(hit.score),
                    text=str(payload.get("text", "")),
                )
            )
        return sources

    def _ensure_collection(self, vector_size: int) -> None:
        existing = {collection.name for collection in self.client.get_collections().collections}
        if self.collection_name in existing:
            return

        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE,
            ),
        )
