import re
import unicodedata


# Zero-width / format chars that should not become "words" on their own
_ZW = re.compile(r"[\u200b\u200c\u200d\ufeff]")


def _is_word_char(ch: str) -> bool:
    """Letter, mark (matras), or number — covers Devanagari, Gujarati, etc."""
    cat = unicodedata.category(ch)
    return cat.startswith("L") or cat.startswith("M") or cat.startswith("N")


def tokenize_words(text: str) -> list[str]:
    """Split text into RSVP tokens for any spaced script (en, hi, gu, …).

    Uses whitespace as the primary boundary (standard for Hindi/Gujarati
    and English). Strips leading/trailing punctuation while keeping
    combining marks attached to their base letters.
    """
    text = _ZW.sub("", text.replace("\u00a0", " "))
    raw = re.split(r"\s+", text.strip())
    out: list[str] = []
    for token in raw:
        if not token:
            continue
        # Trim non-word chars from ends only; keep internal punctuation rare cases
        start, end = 0, len(token)
        while start < end and not _is_word_char(token[start]):
            start += 1
        while end > start and not _is_word_char(token[end - 1]):
            end -= 1
        piece = token[start:end]
        if piece:
            out.append(piece)
    return out


def extract_text(text: str) -> list[dict]:
    """Split pasted/plain text into paragraph blocks on blank lines."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paragraphs and text.strip():
        paragraphs = [text.strip()]
    return [
        {"type": "paragraph", "text": p.replace("\n", " ")} for p in paragraphs
    ]


def paragraph_to_words(text: str) -> list[str]:
    return tokenize_words(text)
