from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List

import fitz


@dataclass(frozen=True)
class PDFPage:
    source: str
    page: int
    text: str


def load_pdf(pdf_path: Path) -> List[PDFPage]:
    pages: List[PDFPage] = []
    doc = fitz.open(pdf_path)
    try:
        for i in range(doc.page_count):
            page = doc.load_page(i)
            text = page.get_text("text")
            pages.append(PDFPage(
                source=pdf_path.name,
                page=i + 1,
                text=text
            ))
    finally:
        doc.close()
    return pages


def iter_pdfs(pdf_dir: Path) -> List[Path]:
    return sorted([p for p in pdf_dir.glob("*.pdf") if p.is_file()])


def extract_page_image(pdf_path: Path, page_number: int, scale: float = 2.0) -> bytes:
    doc = fitz.open(pdf_path)
    try:
        if page_number < 1 or page_number > doc.page_count:
            raise ValueError(f"Page {page_number} out of range (1-{doc.page_count})")
        page = doc.load_page(page_number - 1)
        matrix = fitz.Matrix(scale, scale)
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        return pixmap.tobytes("png")
    finally:
        doc.close()
