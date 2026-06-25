from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    rag_embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    rag_qdrant_collection: str = "ka_dunong_chunks"
    rag_top_k: int = 5
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 80
    rag_enable_ocr: bool = False
    rag_ocr_min_chars: int = 30
    tesseract_cmd: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def backend_dir(self) -> Path:
        return Path(__file__).resolve().parents[1]

    @property
    def data_dir(self) -> Path:
        return self.backend_dir / ".data"

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def qdrant_dir(self) -> Path:
        return self.data_dir / "qdrant"
