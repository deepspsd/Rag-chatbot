from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv

from app.chunking import chunk_text
from app.embedding import embed_texts
from app.pdf_loader import iter_pdfs, load_pdf
from app.settings import get_settings
from app.vectorstore import get_client, get_or_create_collection, upsert_documents


def generate_chunk_id(source: str, page: int, chunk_index: int, text: str) -> str:
    text_hash = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()[:12]
    return f"{source}::p{page}::c{chunk_index}::{text_hash}"


def process_pdf(pdf_path: Path) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
    ids: List[str] = []
    texts: List[str] = []
    metadatas: List[Dict[str, Any]] = []

    pages = load_pdf(pdf_path)
    for page in pages:
        chunks = chunk_text(page.text)
        for idx, chunk in enumerate(chunks):
            chunk_id = generate_chunk_id(page.source, page.page, idx, chunk)
            ids.append(chunk_id)
            texts.append(chunk)
            metadatas.append({
                "source_type": "pdf",
                "source": page.source,
                "page": page.page,
            })

    return ids, texts, metadatas


def ingest_pdfs() -> int:
    load_dotenv()
    settings = get_settings()

    pdf_dir = Path(settings.pdf_dir).resolve()
    if not pdf_dir.exists():
        raise RuntimeError(f"PDF directory not found: {pdf_dir}")

    client = get_client(settings.chroma_persist_dir)
    collection = get_or_create_collection(client, settings.chroma_collection)

    all_ids: List[str] = []
    all_texts: List[str] = []
    all_metadatas: List[Dict[str, Any]] = []

    for pdf_path in iter_pdfs(pdf_dir):
        ids, texts, metadatas = process_pdf(pdf_path)
        all_ids.extend(ids)
        all_texts.extend(texts)
        all_metadatas.extend(metadatas)

    if not all_texts:
        raise RuntimeError("No text extracted from PDFs")

    embeddings = embed_texts(settings.embedding_model, all_texts)
    upsert_documents(collection, all_ids, all_texts, embeddings, all_metadatas)

    return len(all_texts)


if __name__ == "__main__":
    count = ingest_pdfs()
    print(f"Ingested {count} chunks")
