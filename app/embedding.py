from __future__ import annotations

from functools import lru_cache
from typing import List

from sentence_transformers import SentenceTransformer


@lru_cache(maxsize=2)
def get_model(model_name: str) -> SentenceTransformer:
    return SentenceTransformer(model_name)


def embed_texts(model_name: str, texts: List[str]) -> List[List[float]]:
    model = get_model(model_name)
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32,
        show_progress_bar=False
    )
    return [v.tolist() for v in vectors]


def embed_query(model_name: str, query: str) -> List[float]:
    return embed_texts(model_name, [query])[0]
