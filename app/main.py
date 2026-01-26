from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.requests import Request
from pydantic import BaseModel

from app.embedding import get_model, embed_texts
from app.ingest import process_pdf
from app.pdf_loader import extract_page_image
from app.rag import clear_caches, initialize_caches, rag_query
from app.settings import get_settings
from app.vectorstore import get_client, get_or_create_collection, upsert_documents

load_dotenv()
settings = get_settings()

logger = logging.getLogger("rag_chatbot")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

client = get_client(settings.chroma_persist_dir)
collection = get_or_create_collection(client, settings.chroma_collection)

app = FastAPI(title="RAG Chatbot API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_request_id_and_handle_errors(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    try:
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled server error", extra={"request_id": request_id})
        raise HTTPException(status_code=500, detail=f"Internal server error (request_id={request_id})")

class ChatRequest(BaseModel):
    question: str
    allow_web_fallback: bool = True
    source: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    meta: dict


@app.on_event("startup")
def startup():
    initialize_caches(settings.cache_max_items, settings.cache_ttl_seconds)
    get_model(settings.embedding_model)
    
    doc_count = collection.count()
    logger.info("Vector store initialized", extra={"documents": doc_count})
    
    if doc_count == 0:
        logger.warning("No documents in vector store. Run: python -m app.ingest")


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "documents": collection.count()
    }


@app.get("/api/health")
def api_health():
    return health()


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    logger.info(
        "Chat request",
        extra={
            "web_fallback": request.allow_web_fallback,
            "source_filter": request.source or None,
        },
    )

    if not request.source:
        return ChatResponse(
            answer="Documents are not uploaded. Please upload a PDF to ask questions.",
            meta={
                "mode": "no_documents_uploaded",
                "sources": [],
                "urls": [],
                "diagrams": [],
                "retrieval": {"type": "no_source_selected"},
            },
        )
    
    response = rag_query(
        groq_api_key=settings.groq_api_key,
        groq_model=settings.groq_model,
        fallback_models=settings.groq_fallback_models,
        embedding_model=settings.embedding_model,
        collection=collection,
        question=request.question,
        top_k=settings.top_k,
        similarity_threshold=settings.similarity_threshold,
        web_search_enabled=settings.web_search_enabled and request.allow_web_fallback,
        web_max_results=settings.web_max_results,
        web_max_chars=settings.web_max_chars,
        source_filter=request.source,
    )
    
    logger.info(
        "Chat response",
        extra={
            "mode": response.mode,
            "sources": len(response.sources),
            "best_distance": (
                min(response.retrieval_info["distances"]) if response.retrieval_info.get("distances") else None
            ),
        },
    )

    return ChatResponse(
        answer=response.answer,
        meta={
            "mode": response.mode,
            "sources": response.sources,
            "urls": response.urls,
            "diagrams": response.diagrams,
            "retrieval": response.retrieval_info,
        },
    )


@app.post("/upload_pdf")
def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    if file.content_type and file.content_type.lower() not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Invalid content type. Only PDF files are supported")

    uploads_dir = Path("data/uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    dest = uploads_dir / Path(file.filename).name

    max_bytes = int(settings.max_upload_mb) * 1024 * 1024
    total = 0
    try:
        with dest.open("wb") as f:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Max {settings.max_upload_mb}MB",
                    )
                f.write(chunk)
    finally:
        try:
            file.file.close()
        except Exception:
            pass

    logger.info("Processing uploaded PDF", extra={"source": dest.name, "bytes": total})
    ids, texts, metadatas = process_pdf(dest)
    
    if not texts:
        raise HTTPException(status_code=400, detail="No text extracted from PDF")

    logger.info("Extracted chunks", extra={"chunks": len(texts), "source": dest.name})
    embeddings = embed_texts(settings.embedding_model, texts)
    upsert_documents(collection, ids, texts, embeddings, metadatas)

    clear_caches()
    logger.info("Uploaded to vector store", extra={"source": dest.name, "chunks": len(texts)})

    return {"success": True, "source": dest.name, "chunks": len(texts)}


@app.get("/pdf_page_image")
def pdf_page_image(source: str, page: int):
    candidates = [
        Path(settings.pdf_dir) / source,
        Path("data/uploads") / source,
    ]

    pdf_path = next((p for p in candidates if p.exists() and p.is_file()), None)
    if pdf_path is None:
        raise HTTPException(status_code=404, detail="PDF not found")

    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be >= 1")

    try:
        image_data = extract_page_image(pdf_path, page)
        return Response(content=image_data, media_type="image/png")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/sources")
def list_sources():
    pdf_dir = Path(settings.pdf_dir)
    uploads_dir = Path("data/uploads")
    
    sources = []
    
    if pdf_dir.exists():
        sources.extend([{"name": p.name, "type": "dataset"} for p in pdf_dir.glob("*.pdf")])
    
    if uploads_dir.exists():
        sources.extend([{"name": p.name, "type": "upload"} for p in uploads_dir.glob("*.pdf")])
    
    return {"sources": sources}
