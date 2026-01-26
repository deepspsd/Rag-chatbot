from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import chromadb
from chromadb.api.models.Collection import Collection


def get_client(persist_dir: str) -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=persist_dir)


def get_or_create_collection(client: chromadb.PersistentClient, name: str) -> Collection:
    return client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})


def upsert_documents(
    collection: Collection,
    ids: List[str],
    texts: List[str],
    embeddings: List[List[float]],
    metadatas: List[Dict[str, Any]],
) -> None:
    collection.upsert(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )


def search(
    collection: Collection,
    query_embedding: List[float],
    n_results: int,
    where: Optional[Dict[str, Any]] = None,
) -> Tuple[List[str], List[Dict[str, Any]], List[float]]:
    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]

    documents = [d for d in documents if d is not None]
    metadatas = [m for m in metadatas if m is not None]
    distances = [float(d) for d in distances]

    return documents, metadatas, distances


def delete_by_source(collection: Collection, source: str) -> None:
    collection.delete(where={"source": source})
