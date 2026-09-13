import re


def extract_text(text: str) -> list[dict]:
    """Split pasted/plain text into paragraph blocks on blank lines."""
    paragraphs = [
        p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()
    ]
    return [
        {"type": "paragraph", "text": p.replace("\n", " ")} for p in paragraphs
    ]