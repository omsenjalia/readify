import re
import unicodedata

from services.math_text import (
    extract_math_segments,
    glue_units,
    normalize_math_token,
)

_ZW = re.compile(r"[\u200b\u200c\u200d\ufeff]")


def _is_word_char(ch: str) -> bool:
    cat = unicodedata.category(ch)
    return cat.startswith("L") or cat.startswith("M") or cat.startswith("N")


def tokenize_words(text: str) -> list[str]:
    """Split text into RSVP tokens; keep math equations as single tokens."""
    text = _ZW.sub("", text.replace("\u00a0", " "))
    out: list[str] = []
    for segment, is_math in extract_math_segments(text):
        if is_math:
            tok = normalize_math_token(segment)
            if tok:
                out.append(tok)
            continue
        # Keep bullet lines as one readable unit
        s = segment.strip()
        if s.startswith("•"):
            body = s.lstrip("•").strip()
            if body:
                out.append(f"• {body}")
            continue
        raw = re.split(r"\s+", segment.strip())
        for token in raw:
            if not token:
                continue
            start, end = 0, len(token)
            while start < end and not _is_word_char(token[start]):
                start += 1
            while end > start and not _is_word_char(token[end - 1]):
                end -= 1
            piece = token[start:end]
            if piece:
                out.append(piece)
    return glue_units(out)


def _looks_like_markdown(text: str) -> bool:
    sample = text[:4000]
    signals = 0
    for pat in (
        r"^#{1,6}\s+\S",
        r"\*\*[^*]+\*\*",
        r"^\s*[-*+]\s+\S",
        r"\[.+?\]\(.+?\)",
        r"^```",
        r"^>\s+\S",
    ):
        if re.search(pat, sample, re.M):
            signals += 1
    return signals >= 2 or bool(re.search(r"^#{1,6}\s+\S", sample, re.M))


def markdown_to_plain(md: str) -> str:
    text = md.replace("\r\n", "\n")
    text = re.sub(r"```[\w-]*\n([\s\S]*?)```", r"\n\1\n", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"^\s{0,3}>\s?", "", text, flags=re.M)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.M)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.M)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"</?[^>]+>", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def prepare_readable_text(text: str, force_markdown: bool = False) -> str:
    if force_markdown or _looks_like_markdown(text):
        return markdown_to_plain(text)
    return text


def extract_text(text: str) -> list[dict]:
    """Split pasted/plain text or Markdown into paragraph blocks."""
    text = prepare_readable_text(text)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paragraphs and text.strip():
        paragraphs = [text.strip()]
    return [{"type": "paragraph", "text": p.replace("\n", " ")} for p in paragraphs]
