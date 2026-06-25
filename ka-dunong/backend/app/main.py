from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.models import ChatRequest, ChatResponse, MaterialResponse
from app.services.rag.pipeline import RagPipeline

settings = Settings()
pipeline: RagPipeline | None = None

app = FastAPI(title="Ka-Dunong RAG API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def get_pipeline() -> RagPipeline:
    global pipeline
    if pipeline is None:
        pipeline = RagPipeline(settings)
    return pipeline


@app.post("/v1/materials", response_model=MaterialResponse)
async def upload_material(
    file: UploadFile = File(...),
    student_id: str = Form(...),
    subject: str | None = Form(default=None),
    grade_level: str | None = Form(default=None),
) -> MaterialResponse:
    try:
        return await get_pipeline().ingest_material(
            file=file,
            student_id=student_id,
            subject=subject,
            grade_level=grade_level,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Material ingestion failed: {error}") from error


@app.post("/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        return get_pipeline().answer_question(request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Chat request failed: {error}") from error
