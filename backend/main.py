import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from rag_pipeline import ingest_pdf, answer_question, DOC_DIR

load_dotenv()

app = FastAPI(title="RAG Backend")

# CORS - restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your Vite frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    docId: str
    question: str


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Expects multipart/form-data with `file` field.
    Saves the PDF in data/docs/ and ingests (creates per-doc FAISS index).
    Returns: { docId, filename, pages }
    """
    try:
        filename = file.filename
        save_path = os.path.join(DOC_DIR, filename)
        # Ensure unique filename if you prefer, or overwrite
        with open(save_path, "wb") as f:
            f.write(await file.read())

        # Ingest the PDF (builds index in data/indexes/<docId>/)
        doc_id, chunks = ingest_pdf(save_path)

        return {"docId": doc_id, "filename": filename, "pages": chunks}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/query")
async def query(req: QueryRequest):
    """
    Accepts JSON: { docId, question }
    Returns: { answer, sources: [{page, text, score}, ...] }
    """
    try:
        answer, sources = answer_question(req.docId, req.question)
        return {"answer": answer, "sources": sources}
    except FileNotFoundError as fnf:
        return JSONResponse(status_code=404, content={"error": str(fnf)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/health")
def health():
    return {"status": "ok"}
