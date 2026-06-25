from pydantic import BaseModel, Field
from pydantic import BaseModel
from typing import Literal

class PracticeRequest(BaseModel):
    type: Literal["flashcards", "quiz"]
    topic: str
    subject: str = "General"
    grade: str = "Grade 8"
    language: str = "Taglish"
    item_count: int = 10
    context: str = ""    

class EvaluateRequest(BaseModel):
    question: str
    correct_answer: str
    explanation: str
    student_answer: str
    
class OcrDetails(BaseModel):
    enabled: bool
    used: bool
    unavailable: bool = False


class MaterialResponse(BaseModel):
    document_id: str
    filename: str
    mime_type: str
    chunk_count: int
    page_count: int
    ocr: OcrDetails


class ChatMessage(BaseModel):
    role: str
    content: str


class StudentProfile(BaseModel):
    grade_level: str = "Grade 8"
    preferred_language: str = "taglish"
    weak_topics: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    student_id: str
    question: str
    messages: list[ChatMessage] = Field(default_factory=list)
    student_profile: StudentProfile = Field(default_factory=StudentProfile)
    subject: str = "General"
    document_ids: list[str] | None = None
    top_k: int | None = None


class Source(BaseModel):
    document_id: str
    filename: str
    source: str = "student"
    relative_path: str | None = None
    subject: str | None = None
    grade_level: str | None = None
    page_number: int | None = None
    chunk_index: int
    score: float
    text: str


class ChatResponse(BaseModel):
    message: str
    progress: dict | None = None
    sources: list[Source] = Field(default_factory=list)


class AdminStats(BaseModel):
    deped_documents: int
    student_documents: int
    total_chunks: int
    collection: str
