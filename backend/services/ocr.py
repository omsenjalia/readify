"""Document OCR via Nanonets DocStrange API.

Replaces the previous self-hosted GGUF OCR server. Docs:
https://docstrange.nanonets.com/docs/

Auth: set DOCSTRANGE_API_KEY (or NANONETS_API_KEY) to a key from
https://docstrange.nanonets.com / https://app.nanonets.com/#/keys
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Primary sync extract endpoint (Bearer token)
_EXTRACT_SYNC = "https://extraction-api.nanonets.com/api/v1/extract/sync"
# Legacy alternate used in some Nanonets samples
_EXTRACT_LEGACY = "https://extraction-api.nanonets.com/extract"


def _api_key() -> str:
    key = (
        os.environ.get("DOCSTRANGE_API_KEY")
        or os.environ.get("NANONETS_API_KEY")
        or ""
    ).strip()
    if not key:
        raise RuntimeError(
            "DOCSTRANGE_API_KEY (or NANONETS_API_KEY) is not set. "
            "Get a key at https://docstrange.nanonets.com"
        )
    return key


def _parse_text(payload: Any) -> str:
    """Best-effort plain text from DocStrange JSON responses."""
    if payload is None:
        return ""
    if isinstance(payload, str):
        return payload.strip()

    if not isinstance(payload, dict):
        return str(payload).strip()

    # Common shapes from sync API
    result = payload.get("result") or payload.get("data") or payload
    if isinstance(result, str):
        return result.strip()

    if isinstance(result, dict):
        for key in ("markdown", "text", "html", "content"):
            block = result.get(key)
            if isinstance(block, dict) and "content" in block:
                return str(block["content"]).strip()
            if isinstance(block, str) and block.strip():
                return block.strip()
        # Nested content
        content = result.get("content")
        if isinstance(content, str):
            return content.strip()

    # Top-level convenience fields
    for key in ("markdown", "text", "content"):
        val = payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
        if isinstance(val, dict) and val.get("content"):
            return str(val["content"]).strip()

    return ""


async def ocr_page_image(image_bytes: bytes, filename: str = "page.png") -> str:
    """OCR a single page image via DocStrange; returns plain text."""
    return await extract_with_docstrange(
        image_bytes,
        filename=filename,
        content_type="image/png",
        output_format="text",
    )


async def extract_with_docstrange(
    file_bytes: bytes,
    *,
    filename: str,
    content_type: str,
    output_format: str = "markdown",
) -> str:
    """Upload a PDF or image to DocStrange and return extracted text/markdown.

    Tries the v1 sync endpoint first, then the legacy ``/extract`` path.
    """
    key = _api_key()
    headers = {"Authorization": f"Bearer {key}"}

    async with httpx.AsyncClient(timeout=180.0) as client:
        # --- Preferred: /api/v1/extract/sync ---
        files = {"file": (filename, file_bytes, content_type)}
        data = {"output_format": output_format}
        try:
            resp = await client.post(
                _EXTRACT_SYNC, headers=headers, files=files, data=data
            )
            if resp.status_code == 200:
                text = _parse_text(resp.json())
                if text:
                    return text
                logger.warning(
                    "DocStrange sync returned empty text (keys=%s)",
                    list(resp.json().keys())
                    if isinstance(resp.json(), dict)
                    else type(resp.json()),
                )
            else:
                logger.warning(
                    "DocStrange sync HTTP %s: %s",
                    resp.status_code,
                    resp.text[:400],
                )
        except Exception as exc:
            logger.warning("DocStrange sync request failed: %s", exc)

        # --- Fallback: legacy /extract ---
        files = {"file": (filename, file_bytes, content_type)}
        data = {"output_type": output_format, "model": "nanonets"}
        # Some samples use raw API key without Bearer
        for auth_header in (
            headers,
            {"Authorization": key},
        ):
            try:
                resp = await client.post(
                    _EXTRACT_LEGACY, headers=auth_header, files=files, data=data
                )
                if resp.status_code == 200:
                    text = _parse_text(resp.json())
                    if text:
                        return text
                logger.warning(
                    "DocStrange legacy HTTP %s: %s",
                    resp.status_code,
                    resp.text[:400],
                )
            except Exception as exc:
                logger.warning("DocStrange legacy request failed: %s", exc)

    raise RuntimeError("DocStrange OCR returned no usable text")


async def ocr_pdf_bytes(pdf_bytes: bytes, filename: str = "document.pdf") -> str:
    """OCR an entire PDF in one DocStrange call (preferred for multi-page scans)."""
    return await extract_with_docstrange(
        pdf_bytes,
        filename=filename,
        content_type="application/pdf",
        output_format="markdown",
    )
