import asyncio
import logging
import os
import time

import pymupdf

from db import get_supabase
from services.ocr import ocr_page_image

logger = logging.getLogger(__name__)

IMAGE_BUCKET = "document-images"


def _upload_png(supabase, document_id: str, key: str, data: bytes) -> str:
    """Upload a PNG to the public document-images bucket, return its URL."""
    path = f"{document_id}/{key}.png"
    supabase.storage.from_(IMAGE_BUCKET).upload(
        path,
        data,
        {"content-type": "image/png", "upsert": "true"},
    )
    return (
        f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/"
        f"{IMAGE_BUCKET}/{path}"
    )


async def extract_pdf_blocks(
    file_bytes: bytes,
    document_id: str,
    progress_cb=None,
) -> list[dict]:
    """Extract text and image blocks from a PDF byte stream.

    Blocks come back in page order:

    - A page with substantial text emits
      ``{"type": "text", "words": [...]}`` where ``words`` preserves the
      tokenization the RSVP engine consumes.
    - Embedded images on that page are extracted via PyMuPDF, converted to
      PNG, uploaded to the ``document-images`` storage bucket and emitted as
      ``{"type": "image", "image_url": ...}``.
    - An image-only (scanned) page has its full page rendered at 2x scale,
      uploaded the same way, and emitted as an image block flagged
      ``needs_ocr=True``. The rendered PNG is then sent to the GGUF OCR
      server; the resulting text replaces the ``[Scanned page]``
      placeholder. Pages the OCR server cannot read fall back to
      ``[Page could not be read]`` rather than failing the whole document.

    OCR runs concurrently via ``asyncio.gather`` so multi-page scans are
    transcribed in parallel; each page's duration is logged for debugging.
    """
    blocks: list[dict] = []
    supabase = get_supabase()
    ocr_tasks: list[tuple[int, int, bytes]] = []
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            has_text = len(text) > 20

            if has_text:
                blocks.append(
                    {"type": "text", "words": [w for w in text.split() if w]}
                )

            if has_text:
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
            await progress_cb(f"Running OCR on {len(ocr_tasks)} pages…")
        logger.info("Running OCR on %d pages", len(ocr_tasks))
        results = await asyncio.gather(
            *(ocr_page_image(img) for _, _, img in ocr_tasks),
            return_exceptions=True,
        )
        for (page_num, text_block_idx, _), result in zip(
            ocr_tasks, results, strict=True
        ):
            blocks[text_block_idx] = _ocr_result_block(page_num, result)
    return blocks


def _ocr_result_block(page_num: int, result: object) -> dict:
    """Turn a single page's OCR outcome into a text block."""
    start = time.perf_counter()
    if isinstance(result, BaseException):
        logger.warning(
            "OCR failed for page %d after %.2fs: %r",
            page_num,
            time.perf_counter() - start,
            result,
        )
        return {"type": "text", "words": ["[Page could not be read]"]}

    text = result.strip()
    if not text:
        logger.warning("OCR returned empty text for page %d", page_num)
        return {"type": "text", "words": ["[Page could not be read]"]}

    words = text.split()
    logger.info(
        "OCR page %d: %d words in %.2fs",
        page_num,
        len(words),
        time.perf_counter() - start,
    )
    return {"type": "text", "words": words}