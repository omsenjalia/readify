import pymupdf  # PyMuPDF (imports as `fitz` in older versions)


def extract_pdf(file_path: str) -> list[dict]:
    """Extract text blocks (and page images) from a PDF file.

    Returns a list of blocks in reading order. Text blocks are tagged
    ``paragraph``; embedded images are emptied into a per-page list that a
    downstream OCR pass can process. For the skeleton we emit paragraphs
    only, mirroring how PDFs present text via PyMuPDF's dict layout.
    """
    blocks: list[dict] = []
    doc = pymupdf.open(file_path)
    try:
        for page in doc:
            for block in page.get_text("dict")["blocks"]:
                if block["type"] != 0:
                    # type 1 = image; OCR hook goes here later
                    continue
                text = "".join(
                    span["text"]
                    for line in block.get("lines", [])
                    for span in line.get("spans", [])
                ).strip()
                if text:
                    blocks.append({"type": "paragraph", "text": text})
    finally:
        doc.close()
    return blocks


def extract_pdf_pages_images(file_path: str) -> list[dict]:
    """Extract rendered page images for OCR-based pipelines."""
    images: list[dict] = []
    doc = pymupdf.open(file_path)
    try:
        for page_number, page in enumerate(doc, start=1):
            pix = page.get_pixmap(dpi=200)
            images.append(
                {
                    "type": "image",
                    "page": page_number,
                    "format": "png",
                    "bytes": pix.tobytes("png"),
                }
            )
    finally:
        doc.close()
    return images