import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

import pymupdf

from db import get_supabase
from services.ocr import ocr_page_image
from services.text_service import tokenize_words

logger = logging.getLogger(__name__)

IMAGE_BUCKET = "document-images"


def _upload_png(supabase: Any, document_id: str, key: str, data: bytes) -> str:
    """Upload a PNG to the private document-images bucket.

    Returns the *storage path* (``{document_id}/{key}.png``), not a public
    URL. The web app issues short-lived signed URLs when rendering the reader
    so private documents cannot be scraped by guessing object paths.
    """
    path = f"{document_id}/{key}.png"
    supabase.storage.from_(IMAGE_BUCKET).upload(
        path,
        data,
        {"content-type": "image/png", "upsert": "true"},
    )
    return path


ProgressCallback = Callable[[str], Awaitable[None]]


async def extract_pdf_blocks(
    file_bytes: bytes,
    document_id: str,
    progress_cb: ProgressCallback | None = None,
) -> list[dict]:
    """Extract text and image blocks from a PDF byte stream.

    OCR policy (DocStrange is *not* used on normal digital PDFs):

    - **Text page** (``page.get_text`` yields >20 chars): use the native
      text layer only. Embedded figures are uploaded as image blocks for
      the reader — they are never OCRed.
    - **Image-only / scanned / handwritten page** (little or no text layer):
      render the page and OCR via DocStrange. Fully scanned PDFs may use
      one full-file DocStrange call; mixed PDFs OCR only the scanned pages.

    Failures fall back to ``[Page could not be read]`` without failing the
    whole document.
    """
    blocks: list[dict] = []
    supabase = get_supabase()
    ocr_tasks: list[tuple[int, int, bytes]] = []
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        total_pages = doc.page_count
        for page_num, page in enumerate(doc, start=1):
            # Native text layer — never OCR these pages (even if they embed images).
            text = page.get_text("text").strip()
            has_text = len(text) > 20

            if has_text:
                blocks.append(
                    {"type": "text", "words": tokenize_words(text)}
                )

            if has_text:
                # Figures on a text page: always store as images (3s dwell, no OCR
                # of decorative charts). Exception: when the text layer is sparse
                # and a large image holds the real content (equations, scanned
                # fragments), OCR that image so math/text is not lost — while
                # still showing the figure in the reader.
                page_rect = page.rect
                page_area = max(page_rect.width * page_rect.height, 1.0)
                sparse_text = len(text) < 400
                img_objects = page.get_images(full=True)
                for img_idx, img in enumerate(img_objects, start=1):
                    pix = pymupdf.Pixmap(doc, img[0])
                    if pix.n > 4:
                        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                    img_bytes = pix.tobytes("png")
                    url = _upload_png(
                        supabase,
                        document_id,
                        f"img_{page_num}_{img_idx}",
                        img_bytes,
                    )
                    blocks.append({"type": "image", "image_url": url})

                    # Content-image recovery (textbook pages with formula images)
                    try:
                        img_area = float(pix.width * pix.height)
                    except Exception:
                        img_area = 0.0
                    # pixmap is at image resolution; compare roughly to page
                    large = img_area > page_area * 0.15
                    if sparse_text and large and len(img_bytes) > 8_000:
                        text_block_idx = len(blocks)
                        blocks.append(
                            {"type": "text", "words": ["[Figure text]"]}
                        )
                        ocr_tasks.append(
                            (page_num, text_block_idx, img_bytes)
                        )
            else:
                # Scanned / image-only page. Render the page once and reuse
                # the PNG for both the stored image block and the OCR pass.
                pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
                img_bytes = pix.tobytes("png")
                url = _upload_png(
                    supabase, document_id, f"page_{page_num}", img_bytes
                )
                blocks.append(
                    {"type": "image", "image_url": url, "needs_ocr": True}
                )
                text_block_idx = len(blocks)
                blocks.append({"type": "text", "words": ["[Scanned page]"]})
                ocr_tasks.append((page_num, text_block_idx, img_bytes))
    finally:
        doc.close()

    if ocr_tasks:
        if progress_cb:
            await progress_cb(
                f"Running DocStrange OCR on {len(ocr_tasks)} scanned page(s)…"
            )
        logger.info("DocStrange OCR for %d scanned pages", len(ocr_tasks))

        # Prefer one full-PDF call only when *every* page is scanned.
        # Mixed docs (text pages + a few scans) stay per-page so we never
        # re-OCR pages that already have a text layer.
        if len(ocr_tasks) >= 2 and len(ocr_tasks) == total_pages:
            try:
                from services.ocr import ocr_pdf_bytes

                full_text = await ocr_pdf_bytes(file_bytes)
                if full_text and full_text.strip():
                    # Replace all scanned placeholders with a single text stream
                    words = tokenize_words(full_text)
                    # Keep image blocks; collapse OCR text into first placeholder
                    first_idx = ocr_tasks[0][1]
                    blocks[first_idx] = {"type": "text", "words": words}
                    for _, text_block_idx, _ in ocr_tasks[1:]:
                        blocks[text_block_idx] = {
                            "type": "text",
                            "words": [],
                        }
                    # Drop empty text blocks
                    blocks = [
                        b
                        for b in blocks
                        if not (
                            b.get("type") == "text"
                            and not (b.get("words") or [])
                        )
                    ]
                    logger.info(
                        "DocStrange full-PDF OCR: %d words", len(words)
                    )
                    return blocks
            except Exception as exc:
                logger.warning(
                    "Full-PDF DocStrange OCR failed (%s); falling back to per-page",
                    exc,
                )

        # Time each page around the call itself. Previously the elapsed value
        # was read inside `_ocr_result_block`, which runs *after* `gather`
        # resolves — so every logged duration was ~0.00s.
        results = await asyncio.gather(
            *(
                _timed_ocr(page_num, img)
                for page_num, _, img in ocr_tasks
            ),
            return_exceptions=True,
        )
        for (page_num, text_block_idx, _), outcome in zip(
            ocr_tasks, results, strict=True
        ):
            if isinstance(outcome, BaseException):
                # The wrapper itself failed; treat it as an unreadable page.
                blocks[text_block_idx] = _unreadable_block()
                logger.warning("OCR task crashed for page %d: %r", page_num, outcome)
                continue
            elapsed, result = outcome
            blocks[text_block_idx] = _ocr_result_block(page_num, elapsed, result)
    return blocks


async def _timed_ocr(page_num: int, image_bytes: bytes) -> tuple[float, object]:
    """Run one page through OCR and report how long it took.

    Exceptions are returned rather than raised so the timing survives a
    failure; they are already caught by ``asyncio.gather`` either way.
    """
    started = time.perf_counter()
    try:
        text = await ocr_page_image(image_bytes, filename=f"page_{page_num}.png")
    except Exception as exc:  # noqa: BLE001 - reported to the caller
        return time.perf_counter() - started, exc
    return time.perf_counter() - started, text


def _unreadable_block() -> dict:
    """Placeholder shown to the reader when a page cannot be extracted."""
    return {"type": "text", "words": ["[Page could not be read]"]}


def _ocr_result_block(page_num: int, elapsed: float, result: object) -> dict:
    """Turn a single page's OCR outcome into a text block."""
    if isinstance(result, BaseException):
        logger.warning("OCR failed for page %d after %.2fs: %r", page_num, elapsed, result)
        return _unreadable_block()

    text = result.strip()
    if not text:
        logger.warning("OCR returned empty text for page %d", page_num)
        return _unreadable_block()

    words = tokenize_words(text)
    logger.info("OCR page %d: %d words in %.2fs", page_num, len(words), elapsed)
    return {"type": "text", "words": words}