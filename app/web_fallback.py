from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

try:
    from ddgs import DDGS
    DDGS_AVAILABLE = True
except ImportError:
    DDGS_AVAILABLE = False


@dataclass
class WebSearchResult:
    url: str
    title: str
    snippet: str


@dataclass
class WebContext:
    content: str
    urls: List[str]
    results: List[WebSearchResult]


def search_web(query: str, max_results: int = 5) -> List[WebSearchResult]:
    if not DDGS_AVAILABLE:
        return []

    results: List[WebSearchResult] = []
    try:
        ddgs = DDGS()
        search_results = ddgs.text(query, max_results=max_results)
        
        for r in search_results:
            if not r:
                continue
            url = r.get("href") or r.get("link") or r.get("url", "")
            if not url or not url.startswith("http"):
                continue
            
            results.append(WebSearchResult(
                url=url,
                title=r.get("title", ""),
                snippet=r.get("body", "") or r.get("snippet", "")
            ))
    except Exception as e:
        print(f"Web search error: {e}")
        pass

    return results


def fetch_page_content(url: str, timeout: int = 8) -> Optional[str]:
    try:
        response = requests.get(
            url,
            timeout=timeout,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            allow_redirects=True
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside", "form", "iframe"]):
            tag.decompose()

        main_content = soup.find("main") or soup.find("article") or soup.find("body")
        if main_content:
            text = " ".join(main_content.get_text(" ", strip=True).split())
        else:
            text = " ".join(soup.get_text(" ", strip=True).split())
        
        return text[:15000] if text else None
    except Exception as e:
        print(f"Fetch error for {url}: {e}")
        return None


def build_web_context(query: str, max_results: int = 5, max_chars: int = 12000) -> WebContext:
    search_results = search_web(query, max_results)
    
    if not search_results:
        return WebContext(content="", urls=[], results=[])

    content_parts: List[str] = []
    used_urls: List[str] = []
    valid_results: List[WebSearchResult] = []

    for result in search_results:
        page_content = fetch_page_content(result.url)
        if not page_content or len(page_content) < 100:
            continue

        used_urls.append(result.url)
        valid_results.append(result)
        
        snippet = f"Title: {result.title}\nURL: {result.url}\n\nContent:\n{page_content}"
        content_parts.append(snippet)

        combined = "\n\n---\n\n".join(content_parts)
        if len(combined) >= max_chars:
            return WebContext(
                content=combined[:max_chars],
                urls=used_urls,
                results=valid_results
            )

    return WebContext(
        content="\n\n---\n\n".join(content_parts)[:max_chars],
        urls=used_urls,
        results=valid_results
    )


def format_web_results_for_prompt(context: WebContext) -> Tuple[str, str]:
    if not context.content:
        return "", ""

    url_list = "\n".join([f"{i+1}. {url}" for i, url in enumerate(context.urls)])
    return context.content, url_list
