"""DOCX text + formatting extraction via Mammoth.

Mammoth converts to *semantic* HTML (headings, strong/em, lists, links),
which is exactly what the editor needs to show the document as it was
formatted. Plain text for the RSVP stream is derived from that same HTML,
so reader and editor can never drift apart.
"""

import io
from typing import Any

import mammoth

from services.richtext import html_to_text, split_top_level_html


def extract_docx_bytes(data: bytes) -> list[dict[str, Any]]:
    """Extract formatted blocks from raw DOCX bytes.

    Each top-level HTML element (paragraph, heading, list, …) becomes one
    ``{"type": "text", "html": ..., "text": ...}`` block — `block_words`
    tokenises ``text`` for the reader while ``html`` keeps the formatting.
    Falls back to raw-text paragraphs when the HTML body is empty (e.g. a
    document whose content Mammoth cannot map to styles).
    """
    html_result = mammoth.convert_to_html(io.BytesIO(data))
    blocks: list[dict[str, Any]] = []
    for chunk in split_top_level_html(html_result.value):
        text = html_to_text(chunk)
        if not text:
            continue
        blocks.append({"type": "text", "html": chunk, "text": text})
    if blocks:
        return blocks

    # Fallback: no structured HTML survived — degrade to plain paragraphs
    # (the behaviour of earlier builds).
    result = mammoth.extract_raw_text(io.BytesIO(data))
    paragraphs = [p.strip() for p in result.value.split("\n\n") if p.strip()]
    return [{"type": "paragraph", "text": p.replace("\n", " ")} for p in paragraphs]
