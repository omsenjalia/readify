import os

import pymupdf

from db import get_supabase

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


def extract_pdf_blocks(file_bytes: bytes, document_id: str) -> list[dict]:
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
      ``needs_ocr=True`` for the Session-6 OCR pass. A ``[Scanned page]``
      text placeholder keeps the reader from stalling on that page.
    """
    blocks: list[dict] = []
    supabase = get_supabase()
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            has_text = len(text) > 20

            if has_text:
                blocks.append(
                    {"type": "text", "words": [w for w in text.split() if w]}
                )
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
                # Scanned / image-only page. Render the page and hand it to
                # the Session-6 OCR pass via the needs_ocr flag.
                pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
                img_bytes = pix.tobytes("png")
                url = _upload_png(
                    supabase, document_id, f"page_{page_num}", img_bytes
                )
                blocks.append(
                    {"type": "image", "image_url": url, "needs_ocr": True}
                )
                blocks.append({"type": "text", "words": ["[Scanned page]"]})
    finally:
        doc.close()
    return blocks