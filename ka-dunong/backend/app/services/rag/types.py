from dataclasses import dataclass


@dataclass
class ExtractedBlock:
    text: str
    page_number: int | None
    ocr_used: bool = False


@dataclass
class ExtractionResult:
    blocks: list[ExtractedBlock]
    page_count: int
    mime_type: str
    ocr_enabled: bool
    ocr_used: bool
    ocr_unavailable: bool


@dataclass
class DocumentChunk:
    id: str
    text: str
    source: str
    student_id: str | None
    document_id: str
    filename: str
    relative_path: str | None
    mime_type: str
    page_number: int | None
    chunk_index: int
    subject: str | None
    grade_level: str | None
    ocr_used: bool
