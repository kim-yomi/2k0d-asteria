import uuid

from llama_index.core.node_parser import SentenceSplitter

from app.config import Settings
from app.services.rag.types import DocumentChunk, ExtractedBlock


class DocumentChunker:
    def __init__(self, settings: Settings):
        self.splitter = SentenceSplitter(
            chunk_size=settings.rag_chunk_size,
            chunk_overlap=settings.rag_chunk_overlap,
        )

    def chunk(
        self,
        *,
        document_id: str,
        filename: str,
        mime_type: str,
        blocks: list[ExtractedBlock],
        source: str = "student",
        student_id: str | None = None,
        relative_path: str | None = None,
        subject: str | None = None,
        grade_level: str | None = None,
    ) -> list[DocumentChunk]:
        chunks: list[DocumentChunk] = []
        chunk_index = 0

        for block in blocks:
            text = block.text.strip()
            if not text:
                continue

            for chunk_text in self.splitter.split_text(text):
                cleaned = chunk_text.strip()
                if not cleaned:
                    continue

                chunks.append(
                    DocumentChunk(
                        id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}:{chunk_index}")),
                        text=cleaned,
                        source=source,
                        student_id=student_id,
                        document_id=document_id,
                        filename=filename,
                        relative_path=relative_path,
                        mime_type=mime_type,
                        page_number=block.page_number,
                        chunk_index=chunk_index,
                        subject=subject,
                        grade_level=grade_level,
                        ocr_used=block.ocr_used,
                    )
                )
                chunk_index += 1

        return chunks
