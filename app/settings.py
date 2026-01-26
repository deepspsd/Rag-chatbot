from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    groq_model: str
    groq_fallback_models: List[str]
    embedding_model: str
    chroma_persist_dir: str
    chroma_collection: str
    pdf_dir: str
    top_k: int
    similarity_threshold: float
    web_search_enabled: bool
    web_max_results: int
    web_max_chars: int
    cache_max_items: int
    cache_ttl_seconds: int
    cors_allow_origins: List[str]
    cors_allow_credentials: bool
    max_upload_mb: int


def get_settings() -> Settings:
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    fallback_models_raw = os.getenv("GROQ_FALLBACK_MODELS", "llama-3.1-8b-instant,llama-3.3-70b-versatile")
    fallback_models = [m.strip() for m in fallback_models_raw.split(",") if m.strip()]

    cors_allow_origins_raw = os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://192.168.29.184:3000,https://rag-chatbot.vercel.app",
    ).strip()
    cors_allow_origins = [o.strip() for o in cors_allow_origins_raw.split(",") if o.strip()]

    return Settings(
        groq_api_key=groq_api_key,
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip(),
        groq_fallback_models=fallback_models,
        embedding_model=os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5").strip(),
        chroma_persist_dir=os.getenv("CHROMA_PERSIST_DIR", "data/chroma").strip(),
        chroma_collection=os.getenv("CHROMA_COLLECTION", "documents").strip(),
        pdf_dir=os.getenv("PDF_DIR", "dataset/pdfs").strip(),
        top_k=int(os.getenv("TOP_K", "12")),
        similarity_threshold=float(os.getenv("SIMILARITY_THRESHOLD", "0.5")),
        web_search_enabled=os.getenv("WEB_SEARCH_ENABLED", "true").lower() == "true",
        web_max_results=int(os.getenv("WEB_MAX_RESULTS", "6")),
        web_max_chars=int(os.getenv("WEB_MAX_CHARS", "12000")),
        cache_max_items=int(os.getenv("CACHE_MAX_ITEMS", "512")),
        cache_ttl_seconds=int(os.getenv("CACHE_TTL_SECONDS", os.getenv("CACHE_TTL_S", "3600"))),
        cors_allow_origins=cors_allow_origins,
        cors_allow_credentials=os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true",
        max_upload_mb=int(os.getenv("MAX_UPLOAD_MB", "50")),
    )
