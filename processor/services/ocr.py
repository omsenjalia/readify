import os

import httpx


def ocr_image(image_bytes: bytes, filename: str = "page.png") -> str:
    """Send an image to the GGUF OCR server and return extracted text."""
    url = os.environ.get("OCR_SERVER_URL", "")
    if not url:
        raise RuntimeError("OCR_SERVER_URL is not configured")

    secret = os.environ.get("OCR_SERVER_SECRET", "")
    headers = {"Authorization": f"Bearer {secret}"} if secret else {}

    with httpx.Client(timeout=120) as client:
        resp = client.post(
            url,
            headers=headers,
            files={"file": (filename, image_bytes, "image/png")},
        )
        resp.raise_for_status()
        data = resp.json()

    text = data.get("text") or data.get("result")
    if isinstance(text, str):
        return text
    raise RuntimeError("OCR server returned an unexpected payload")