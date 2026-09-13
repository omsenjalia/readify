import base64
import os

import httpx


async def ocr_page_image(image_bytes: bytes) -> str:
    """Send a page image to the self-hosted GGUF OCR server.

    Returns the transcribed text string.
    """
    b64 = base64.b64encode(image_bytes).decode()
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            os.environ["OCR_SERVER_URL"],
            headers={"Authorization": f"Bearer {os.environ['OCR_SERVER_SECRET']}"},
            json={"image_base64": b64},
        )
        resp.raise_for_status()
        data = resp.json()
        # Expected response: {"text": "...", "confidence": 0.95}
        return data["text"]