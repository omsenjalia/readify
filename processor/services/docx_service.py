import io

import mammoth


def extract_docx(file_path: str) -> list[dict]:
    """Extract text blocks from a DOCX file via Mammoth.

    Paragraphs are separated by blank lines; lines inside a paragraph are
    re-joined so a multi-line block collapses into a single text column.
    """
    with open(file_path, "rb") as f:
        return extract_docx_bytes(f.read())


def extract_docx_bytes(data: bytes) -> list[dict]:
    """Extract text blocks from raw DOCX bytes (skeleton variant)."""
    result = mammoth.extract_raw_text(io.BytesIO(data))
    paragraphs = [
        p.strip() for p in result.value.split("\n\n") if p.strip()
    ]
    return [
        {"type": "paragraph", "text": p.replace("\n", " ")} for p in paragraphs
    ]