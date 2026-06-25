import logging
import pickle

from qdrant_client import QdrantClient, models

from app.config import Settings
from app.models import AdminStats, Source
from app.services.rag.types import DocumentChunk

logger = logging.getLogger("ka_dunong.rag")


def get_collection_stats(settings: Settings) -> AdminStats:
    collection_name = settings.rag_qdrant_collection
    storage_dir = settings.qdrant_dir
    logger.warning("Qdrant stats storage directory: %s", storage_dir)
    logger.warning("Qdrant stats collection name: %s", collection_name)

    sqlite_stats = collect_local_storage_stats(settings)
    if sqlite_stats is not None:
        logger.warning("Qdrant stats total points: %s", sqlite_stats.total_chunks)
        return sqlite_stats

    client = QdrantClient(path=str(storage_dir))
    existing = {collection.name for collection in client.get_collections().collections}
    if collection_name not in existing:
        logger.warning("Qdrant stats total points: 0")
        return AdminStats(
            deped_documents=0,
            student_documents=0,
            total_chunks=0,
            collection=collection_name,
        )

    stats = collect_stats(client, collection_name)
    logger.warning("Qdrant stats total points: %s", stats.total_chunks)
    return stats


def collect_local_storage_stats(settings: Settings) -> AdminStats | None:
    collection_name = settings.rag_qdrant_collection
    sqlite_path = settings.qdrant_dir / "collection" / collection_name / "storage.sqlite"
    if not sqlite_path.exists():
        return None

    import sqlite3

    deped_documents: set[str] = set()
    student_documents: set[str] = set()
    total_chunks = 0

    connection = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    try:
        cursor = connection.cursor()
        for (point_blob,) in cursor.execute("select point from points"):
            total_chunks += 1
            point = pickle.loads(point_blob)
            payload = point.payload or {}
            document_id = str(payload.get("document_id") or "")
            if not document_id:
                continue

            if payload.get("source") == "deped":
                deped_documents.add(document_id)
            elif payload.get("student_id"):
                student_documents.add(document_id)
    finally:
        connection.close()

    return AdminStats(
        deped_documents=len(deped_documents),
        student_documents=len(student_documents),
        total_chunks=total_chunks,
        collection=collection_name,
    )


def collect_stats(client: QdrantClient, collection_name: str) -> AdminStats:
    deped_documents: set[str] = set()
    student_documents: set[str] = set()
    total_chunks = 0
    offset = None

    while True:
        points, offset = client.scroll(
            collection_name=collection_name,
            limit=256,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )

        for point in points:
            total_chunks += 1
            payload = point.payload or {}
            document_id = str(payload.get("document_id") or "")
            if not document_id:
                continue

            if payload.get("source") == "deped":
                deped_documents.add(document_id)
            elif payload.get("student_id"):
                student_documents.add(document_id)

        if offset is None:
            break

    return AdminStats(
        deped_documents=len(deped_documents),
        student_documents=len(student_documents),
        total_chunks=total_chunks,
        collection=collection_name,
    )


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
                    "source": chunk.source,
                    "student_id": chunk.student_id,
                    "document_id": chunk.document_id,
                    "filename": chunk.filename,
                    "relative_path": chunk.relative_path,
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
        student_filters = [
            models.FieldCondition(
                key="student_id",
                match=models.MatchValue(value=student_id),
            )
        ]
        if document_ids:
            student_filters.append(
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchAny(any=document_ids),
                )
            )

        student_hits = self._search_with_filter(
            query_vector=query_vector,
            filters=student_filters,
            limit=top_k,
        )
        deped_hits = self._search_with_filter(
            query_vector=query_vector,
            filters=[
                models.FieldCondition(
                    key="source",
                    match=models.MatchValue(value="deped"),
                )
            ],
            limit=top_k,
        )

        hits = sorted([*student_hits, *deped_hits], key=lambda hit: hit.score, reverse=True)[
            : max(1, top_k)
        ]
        return [self._hit_to_source(hit) for hit in hits]

    def stats(self) -> AdminStats:
        return collect_stats(self.client, self.collection_name)

    def _search_with_filter(
        self,
        *,
        query_vector: list[float],
        filters: list[models.FieldCondition],
        limit: int,
    ):
        return self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=models.Filter(must=filters),
            limit=max(1, limit),
        )

    def _hit_to_source(self, hit) -> Source:
        payload = hit.payload or {}
        return Source(
            document_id=str(payload.get("document_id", "")),
            filename=str(payload.get("filename", "")),
            source=str(payload.get("source") or "student"),
            relative_path=payload.get("relative_path"),
            subject=payload.get("subject"),
            grade_level=payload.get("grade_level"),
            page_number=payload.get("page_number"),
            chunk_index=int(payload.get("chunk_index", 0)),
            score=float(hit.score),
            text=str(payload.get("text", "")),
        )

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
