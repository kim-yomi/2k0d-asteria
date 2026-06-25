# Ka-Dunong RAG Backend

FastAPI service for the Ka-Dunong hackathon MVP. It accepts uploaded PDF/DOCX learning materials, chunks and embeds them, stores them in embedded Qdrant, retrieves relevant chunks for a student question, and sends a grounded tutoring prompt to Claude.

## Setup

```bash
cd ka-dunong/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Use a single Uvicorn worker with embedded Qdrant.

## Environment

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
RAG_ENABLE_OCR=false
RAG_TOP_K=5
TESSERACT_CMD=
```

Uploaded files and Qdrant data are stored under `backend/.data/` for the MVP.

## Index DepEd Resources

Place official DepEd PDF or DOCX files under `backend/knowledge/deped/` using any nested grade/subject folders, then run:

```bash
python backend/scripts/index_deped.py
```

The script recursively indexes every PDF and DOCX into the same embedded Qdrant collection used by student uploads. Chat retrieval searches both the built-in DepEd knowledge base and the current student's uploaded materials.
