"""DOCX text extraction via Mammoth."""

import io
from typing import Any

import mammoth


def extract_docx_bytes(data: bytes) -> list[dict[str, Any]]:
    """Extract paragraph blocks from raw DOCX bytes.

    Blank lines separate paragraphs; newlines inside a paragraph are collapsed
    so a wrapped block becomes one text column for the reader.
    """
    result = mammoth.extract_raw_text(io.BytesIO(data))
    paragraphs = [p.strip() for p in result.value.split("\n\n") if p.strip()]
    return [{"type": "paragraph", "text": p.replace("\n", " ")} for p in paragraphs]
