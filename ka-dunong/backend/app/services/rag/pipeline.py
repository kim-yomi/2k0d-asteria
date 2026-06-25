import mimetypes
import re
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import Settings
from app.models import ChatRequest, ChatResponse, MaterialResponse, OcrDetails
from app.services.rag.chunker import DocumentChunker
from app.services.rag.claude import ClaudeClient
from app.services.rag.embeddings import EmbeddingService
from app.services.rag.extractors import DocumentExtractor
from app.services.rag.prompt import build_user_prompt
from app.services.rag.vector_store import QdrantVectorStore


class RagPipeline:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.extractor = DocumentExtractor(settings)
        self.chunker = DocumentChunker(settings)
        self.embeddings = EmbeddingService(settings)
        self.vector_store = QdrantVectorStore(settings, self.embeddings.dimension)

    async def ingest_material(
        self,
        *,
        file: UploadFile,
        student_id: str,
        subject: str | None,
        grade_level: str | None,
    ) -> MaterialResponse:
        filename = Path(file.filename or "upload").name
        suffix = Path(filename).suffix.lower()
        if suffix not in {".pdf", ".docx"}:
            raise ValueError("Only PDF and DOCX uploads are supported.")
        if not student_id.strip():
            raise ValueError("student_id is required.")

        document_id = str(uuid.uuid4())
        mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        stored_path = self._material_path(student_id, document_id, filename)
        stored_path.parent.mkdir(parents=True, exist_ok=True)
        stored_path.write_bytes(await file.read())

        extraction = self.extractor.extract(stored_path, filename, mime_type)
        chunks = self.chunker.chunk(
            document_id=document_id,
            filename=filename,
            mime_type=extraction.mime_type,
            source="student",
            student_id=student_id,
            subject=subject,
            grade_level=grade_level,
            blocks=extraction.blocks,
        )
        if not chunks:
            raise ValueError("No readable text was found in this material.")

        vectors = self.embeddings.embed_texts([chunk.text for chunk in chunks])
        self.vector_store.upsert_chunks(chunks, vectors)

        return MaterialResponse(
            document_id=document_id,
            filename=filename,
            mime_type=extraction.mime_type,
            chunk_count=len(chunks),
            page_count=extraction.page_count,
            ocr=OcrDetails(
                enabled=extraction.ocr_enabled,
                used=extraction.ocr_used,
                unavailable=extraction.ocr_unavailable,
            ),
        )

    def answer_question(self, request: ChatRequest) -> ChatResponse:
        if not request.student_id.strip():
            raise ValueError("student_id is required.")
        if not request.question.strip():
            raise ValueError("question is required.")

        query_vector = self.embeddings.embed_query(request.question)
        top_k = request.top_k or self.settings.rag_top_k
        sources = self.vector_store.search(
            student_id=request.student_id,
            query_vector=query_vector,
            top_k=top_k,
            document_ids=request.document_ids,
        )
        prompt = build_user_prompt(request, sources)
        return ClaudeClient(self.settings).complete(prompt, sources)

    def _material_path(self, student_id: str, document_id: str, filename: str) -> Path:
        safe_student = self._safe_path_part(student_id)
        safe_name = self._safe_path_part(filename)
        return self.settings.upload_dir / safe_student / f"{document_id}-{safe_name}"

    def _safe_path_part(self, value: str) -> str:
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip(".-")
        return cleaned or "upload"
