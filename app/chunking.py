from __future__ import annotations

from typing import List


def normalize_whitespace(text: str) -> str:
    return " ".join(text.replace("\u00a0", " ").split())


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> List[str]:
    normalized = normalize_whitespace(text)
    if not normalized:
        return []

    if len(normalized) <= chunk_size:
        return [normalized]

    chunks: List[str] = []
    start = 0
    text_length = len(normalized)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        
        if end < text_length:
            last_period = normalized.rfind(".", start, end)
            last_newline = normalized.rfind("\n", start, end)
            last_space = normalized.rfind(" ", start, end)
            
            boundary = max(last_period, last_newline, last_space)
            if boundary > start + chunk_size // 2:
                end = boundary + 1
        
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        if end >= text_length:
            break
        
        start = max(0, end - overlap)

    return chunks


def chunk_texts(texts: List[str], chunk_size: int = 1200, overlap: int = 200) -> List[str]:
    result: List[str] = []
    for text in texts:
        result.extend(chunk_text(text, chunk_size, overlap))
    return result
