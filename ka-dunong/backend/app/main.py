from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.models import AdminStats, ChatRequest, ChatResponse, MaterialResponse
from app.services.rag.pipeline import RagPipeline
from app.services.rag.vector_store import get_collection_stats
from app.services.rag.practice import PracticeGenerator
from app.models import PracticeRequest, EvaluateRequest

settings = Settings()
pipeline: RagPipeline | None = None

app = FastAPI(title="Ka-Dunong RAG API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://2k0d-asteria-production.up.railway.app",
    ],
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

practice_gen: PracticeGenerator | None = None

def get_practice_gen() -> PracticeGenerator:
     global practice_gen
     if practice_gen is None:
         practice_gen = PracticeGenerator(settings)
     return practice_gen

@app.post("/v1/practice")
async def generate_practice(request: PracticeRequest) -> dict:
     gen = get_practice_gen()
     try:
         if request.type == "flashcards":
             items = gen.generate_flashcards(
                 topic=request.topic,
                 subject=request.subject,
                 grade=request.grade,
                 language=request.language,
                 count=request.item_count,
                 context=request.context,
             )
         else:
             items = gen.generate_quiz(
                 topic=request.topic,
                 subject=request.subject,
                 grade=request.grade,
                 language=request.language,
                 count=request.item_count,
                 context=request.context,
             )
         return {"type": request.type, "topic": request.topic, "items": items}
     except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/practice/evaluate")
async def evaluate_answer(request: EvaluateRequest) -> dict:
     try:
         return get_practice_gen().evaluate_open_ended(
             question=request.question,
             correct_answer=request.correct_answer,
             explanation=request.explanation,
             student_answer=request.student_answer,
         )
     except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/admin/stats", response_model=AdminStats)
def admin_stats() -> AdminStats:
    try:
        return get_collection_stats(settings)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Stats request failed: {error}") from error
