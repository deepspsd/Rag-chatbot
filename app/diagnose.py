from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv

from app.embedding import embed_query
from app.settings import get_settings
from app.vectorstore import get_client, get_or_create_collection, search


def diagnose_embeddings():
    load_dotenv()
    settings = get_settings()
    
    client = get_client(settings.chroma_persist_dir)
    collection = get_or_create_collection(client, settings.chroma_collection)
    
    print("=" * 80)
    print("RAG CHATBOT DIAGNOSTIC TOOL")
    print("=" * 80)
    
    count = collection.count()
    print(f"\n✓ Total documents in vector store: {count}")
    
    if count == 0:
        print("\n❌ ERROR: No documents found in vector store!")
        print("   Run: python -m app.ingest")
        return
    
    sample = collection.get(limit=5, include=["documents", "metadatas"])
    print(f"\n✓ Sample documents:")
    for i, (doc, meta) in enumerate(zip(sample["documents"], sample["metadatas"]), 1):
        source = meta.get("source", "unknown")
        page = meta.get("page", "?")
        preview = doc[:100].replace("\n", " ")
        print(f"   {i}. {source} (page {page}): {preview}...")
    
    print("\n" + "=" * 80)
    print("TESTING RETRIEVAL")
    print("=" * 80)
    
    test_queries = [
        "What is the OSI model?",
        "Explain TCP protocol",
        "What is IP addressing?",
    ]
    
    for query in test_queries:
        print(f"\n📝 Query: '{query}'")
        query_embedding = embed_query(settings.embedding_model, query)
        docs, metas, distances = search(collection, query_embedding, n_results=3)
        
        print(f"   Retrieved {len(docs)} results:")
        for i, (doc, meta, dist) in enumerate(zip(docs, metas, distances), 1):
            source = meta.get("source", "unknown")
            page = meta.get("page", "?")
            preview = doc[:80].replace("\n", " ")
            print(f"   {i}. Distance: {dist:.4f} | {source} p{page}")
            print(f"      {preview}...")
        
        if distances and min(distances) > settings.similarity_threshold:
            print(f"   ⚠️  WARNING: Best match distance ({min(distances):.4f}) > threshold ({settings.similarity_threshold})")
    
    print("\n" + "=" * 80)
    print("INTERACTIVE TEST")
    print("=" * 80)
    print("Enter a question to test retrieval (or 'quit' to exit):")
    
    while True:
        try:
            user_query = input("\n> ").strip()
            if not user_query or user_query.lower() in ["quit", "exit", "q"]:
                break
            
            query_embedding = embed_query(settings.embedding_model, user_query)
            docs, metas, distances = search(collection, query_embedding, n_results=5)
            
            print(f"\n📊 Top {len(docs)} results:")
            for i, (doc, meta, dist) in enumerate(zip(docs, metas, distances), 1):
                source = meta.get("source", "unknown")
                page = meta.get("page", "?")
                print(f"\n{i}. {source} (page {page}) - Distance: {dist:.4f}")
                print(f"   {doc[:200]}...")
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n✓ Diagnostic complete!")


if __name__ == "__main__":
    diagnose_embeddings()
