from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from groq import BadRequestError, Groq, NotFoundError

from app.cache import TTLCache
from app.embedding import embed_query
from app.vectorstore import search
from app.web_fallback import build_web_context, format_web_results_for_prompt


@dataclass
class RetrievalResult:
    documents: List[str]
    metadatas: List[Dict[str, Any]]
    distances: List[float]


@dataclass
class RAGResponse:
    answer: str
    mode: str
    sources: List[Dict[str, Any]]
    urls: List[str]
    diagrams: List[Dict[str, Any]]
    retrieval_info: Dict[str, Any]


_embedding_cache: TTLCache[str, List[float]]
_retrieval_cache: TTLCache[str, RetrievalResult]
_answer_cache: TTLCache[str, RAGResponse]


def clear_caches() -> None:
    _embedding_cache.clear()
    _retrieval_cache.clear()
    _answer_cache.clear()


def initialize_caches(max_items: int, ttl_seconds: int) -> None:
    global _embedding_cache, _retrieval_cache, _answer_cache
    _embedding_cache = TTLCache(max_items * 4, 86400)
    _retrieval_cache = TTLCache(max_items * 2, min(21600, ttl_seconds))
    _answer_cache = TTLCache(max_items, ttl_seconds)


initialize_caches(512, 3600)


def cache_key(*parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8", errors="ignore"))
        h.update(b"\x00")
    return h.hexdigest()


def is_casual_conversation(question: str) -> bool:
    normalized = question.lower().strip()
    casual_patterns = [
        "hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening",
        "how are you", "what's up", "whats up", "sup", "yo",
        "thanks", "thank you", "thx", "appreciate it",
        "bye", "goodbye", "see you", "later",
        "ok", "okay", "cool", "nice", "great", "awesome",
        "who are you", "what are you", "what can you do",
    ]
    
    words = normalized.split()
    if len(words) <= 3 and any(pattern in normalized for pattern in casual_patterns):
        return True
    
    return False


def handle_casual_conversation(question: str, client: Groq, model: str, fallback_models: List[str]) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a professional AI assistant. "
                "Respond politely to greetings and casual messages. "
                "Keep responses brief, clear, and natural. "
                "If the user has uploaded a document, encourage them to ask questions about it."
            ),
        },
        {
            "role": "user",
            "content": question,
        },
    ]
    return call_llm(client, model, fallback_models, messages, temperature=0.7, max_tokens=150)



def format_context(documents: List[str], metadatas: List[Dict[str, Any]]) -> str:
    blocks: List[str] = []
    for i, (doc, meta) in enumerate(zip(documents, metadatas), start=1):
        source = meta.get("source", "")
        page = meta.get("page", "")
        label = f"[{i}] {source} page {page}" if source and page else f"[{i}]"
        blocks.append(f"{label}:\n{doc}")
    return "\n\n".join(blocks)


def format_sources(metadatas: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for i, meta in enumerate(metadatas, start=1):
        source = meta.get("source", "")
        page = meta.get("page", "")
        if source and page:
            lines.append(f"[{i}] {source} (page {page})")
        elif source:
            lines.append(f"[{i}] {source}")
    return "\n".join(lines)


def answer_with_llm_knowledge(
    client: Groq,
    model: str,
    fallback_models: List[str],
    question: str,
) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a professional and knowledgeable AI assistant. "
                "Answer questions using your general knowledge. "
                "Be clear, accurate, and concise. "
                "If you are unsure or the answer may be outdated, start your response with 'NEED_WEB_SEARCH:' and then briefly explain why."
            ),
        },
        {
            "role": "user",
            "content": question,
        },
    ]
    return call_llm(client, model, fallback_models, messages, temperature=0.5, max_tokens=1500)


def call_llm(
    client: Groq,
    model: str,
    fallback_models: List[str],
    messages: List[Dict[str, str]],
    temperature: float = 0.2,
    max_tokens: int = 1024,
) -> str:
    models_to_try = [model] + [m for m in fallback_models if m != model]
    last_error: Optional[Exception] = None

    for m in models_to_try:
        try:
            response = client.chat.completions.create(
                model=m,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return (response.choices[0].message.content or "").strip()
        except NotFoundError as e:
            last_error = e
            continue
        except BadRequestError as e:
            message = str(getattr(e, "message", "") or e)
            if "decommissioned" in message:
                last_error = e
                continue
            raise

    raise last_error or RuntimeError("No LLM model available")


def answer_from_documents(
    client: Groq,
    model: str,
    fallback_models: List[str],
    question: str,
    context: str,
    sources: str,
) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a professional AI assistant for document question answering. "
                "Use the provided document context as the primary source of truth.\n\n"
                "Guidelines:\n"
                "1. Answer based on the provided document context\n"
                "2. If the context is insufficient, start your response with 'INSUFFICIENT_CONTEXT:' and then ask a clarifying question or suggest enabling web search\n"
                "3. Use clear, neutral, and professional language\n"
                "4. Cite sources using [1], [2], etc. when referencing specific passages\n"
                "5. Structure the response with short paragraphs or bullet points when helpful\n"
                "6. Do not invent details that are not supported by the context"
            ),
        },
        {
            "role": "user",
            "content": f"QUESTION:\n{question}\n\n---\n\nDOCUMENT CONTEXT:\n{context}\n\n---\n\nSOURCES:\n{sources}",
        },
    ]
    return call_llm(client, model, fallback_models, messages, temperature=0.3, max_tokens=1500)


def answer_from_web(
    client: Groq,
    model: str,
    fallback_models: List[str],
    question: str,
    web_context: str,
    url_list: str,
) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a professional AI assistant that answers questions using web search results.\n\n"
                "Guidelines:\n"
                "1. Synthesize information from the provided web results into a clear, accurate answer\n"
                "2. If results conflict, acknowledge the conflict and explain the difference\n"
                "3. Keep a neutral, professional tone\n"
                "4. Include the most relevant details first, then supporting details\n"
                "5. When possible, reference sources (e.g., 'Source 1', 'Source 2') and include links from the URL list\n"
                "6. If the results are insufficient, say so and suggest what to search for next"
            ),
        },
        {
            "role": "user",
            "content": f"QUESTION:\n{question}\n\n---\n\nWEB SEARCH RESULTS:\n{web_context}\n\n---\n\nSOURCE URLS:\n{url_list}",
        },
    ]
    return call_llm(client, model, fallback_models, messages, temperature=0.3, max_tokens=1500)


def extract_diagrams(
    metadatas: List[Dict[str, Any]], 
    distances: List[float],
    threshold: float = 0.5,
    limit: int = 4
) -> List[Dict[str, Any]]:
    seen = set()
    diagrams: List[Dict[str, Any]] = []

    for meta, distance in zip(metadatas, distances):
        if distance > threshold:
            continue
        
        source = meta.get("source")
        page = meta.get("page")
        if not source or not page:
            continue
        
        key = (str(source), int(page))
        if key in seen:
            continue
        
        seen.add(key)
        diagrams.append({
            "source": str(source),
            "page": int(page),
            "url": f"/pdf_page_image?source={source}&page={page}"
        })
        
        if len(diagrams) >= limit:
            break

    return diagrams


def rag_query(
    groq_api_key: str,
    groq_model: str,
    fallback_models: List[str],
    embedding_model: str,
    collection: Any,
    question: str,
    top_k: int,
    similarity_threshold: float,
    web_search_enabled: bool,
    web_max_results: int,
    web_max_chars: int,
    source_filter: Optional[str] = None,
) -> RAGResponse:
    normalized_question = " ".join(question.strip().split())

    client = Groq(api_key=groq_api_key)

    if is_casual_conversation(normalized_question):
        casual_answer = handle_casual_conversation(normalized_question, client, groq_model, fallback_models)
        return RAGResponse(
            answer=casual_answer,
            mode="conversational",
            sources=[],
            urls=[],
            diagrams=[],
            retrieval_info={"type": "casual_conversation"},
        )

    answer_key = cache_key(
        "answer",
        groq_model,
        embedding_model,
        str(top_k),
        str(similarity_threshold),
        str(web_search_enabled),
        source_filter or "",
        normalized_question,
    )

    cached_answer = _answer_cache.get(answer_key)
    if cached_answer is not None:
        return cached_answer

    embedding_key = cache_key("embedding", embedding_model, normalized_question)
    question_embedding = _embedding_cache.get(embedding_key)
    if question_embedding is None:
        question_embedding = embed_query(embedding_model, normalized_question)
        _embedding_cache.set(embedding_key, question_embedding)

    retrieval_key = cache_key("retrieval", str(top_k), embedding_model, source_filter or "", normalized_question)
    cached_retrieval = _retrieval_cache.get(retrieval_key)

    if cached_retrieval is None:
        where = {"source_type": "pdf"}
        if source_filter:
            where = {"$and": [{"source_type": "pdf"}, {"source": source_filter}]}
        documents, metadatas, distances = search(collection, question_embedding, top_k, where)
        retrieval = RetrievalResult(documents, metadatas, distances)
        _retrieval_cache.set(retrieval_key, retrieval)
    else:
        retrieval = cached_retrieval

    filtered: List[Tuple[str, Dict[str, Any], float]] = []
    for doc, meta, dist in zip(retrieval.documents, retrieval.metadatas, retrieval.distances):
        try:
            d = float(dist)
        except Exception:
            continue
        if d <= similarity_threshold:
            filtered.append((doc, meta, d))

    if filtered:
        retrieval = RetrievalResult(
            documents=[d[0] for d in filtered],
            metadatas=[d[1] for d in filtered],
            distances=[d[2] for d in filtered],
        )

    if not retrieval.documents or len(retrieval.documents) == 0:
        llm_answer = answer_with_llm_knowledge(client, groq_model, fallback_models, question)

        if web_search_enabled and llm_answer.strip().upper().startswith("NEED_WEB_SEARCH:"):
            web_context = build_web_context(normalized_question, web_max_results, web_max_chars)
            if web_context.content and web_context.urls:
                web_content, url_list = format_web_results_for_prompt(web_context)
                web_answer = answer_from_web(client, groq_model, fallback_models, question, web_content, url_list)
                
                response = RAGResponse(
                    answer=web_answer,
                    mode="web_fallback",
                    sources=[],
                    urls=web_context.urls,
                    diagrams=[],
                    retrieval_info={"type": "no_documents_web_search"},
                )
                _answer_cache.set(answer_key, response)
                return response
        
        response = RAGResponse(
            answer=llm_answer,
            mode="llm_knowledge",
            sources=[],
            urls=[],
            diagrams=[],
            retrieval_info={"type": "no_documents_llm_only"},
        )
        _answer_cache.set(answer_key, response)
        return response

    context = format_context(retrieval.documents, retrieval.metadatas)
    sources = format_sources(retrieval.metadatas)
    answer = answer_from_documents(client, groq_model, fallback_models, question, context, sources)

    use_web = (
        web_search_enabled
        and answer.strip().upper().startswith("INSUFFICIENT_CONTEXT:")
    )

    if use_web:
        web_context = build_web_context(normalized_question, web_max_results, web_max_chars)
        
        if web_context.content and web_context.urls:
            web_content, url_list = format_web_results_for_prompt(web_context)
            web_answer = answer_from_web(client, groq_model, fallback_models, question, web_content, url_list)

            response = RAGResponse(
                answer=web_answer,
                mode="web_fallback",
                sources=retrieval.metadatas,
                urls=web_context.urls,
                diagrams=[],
                retrieval_info={"distances": retrieval.distances, "count": len(retrieval.documents)},
            )
            _answer_cache.set(answer_key, response)
            return response

    response = RAGResponse(
        answer=answer,
        mode="document_rag",
        sources=retrieval.metadatas,
        urls=[],
        diagrams=extract_diagrams(retrieval.metadatas, retrieval.distances, similarity_threshold),
        retrieval_info={"distances": retrieval.distances, "count": len(retrieval.documents)},
    )
    _answer_cache.set(answer_key, response)
    return response
