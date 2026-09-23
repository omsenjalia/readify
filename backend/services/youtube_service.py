"""YouTube transcript extraction."""

import re
from urllib.parse import parse_qs, urlparse

from services.richtext import plain_text_to_html

#: Video ids are always 11 URL-safe base64 characters.
_VIDEO_ID = re.compile(r"^[\w-]{11}$")

#: Path prefixes that put the id in the first path segment.
_PATH_PREFIXES = {"embed", "shorts", "live", "v"}

#: Hosts that use the `?v=<id>` query form (and path forms).
_QUERY_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
}

#: Preferred transcript languages, in order.
DEFAULT_LANGS = ("en", "en-US", "en-GB")

#: Target paragraph length, in characters.
PARAGRAPH_TARGET_CHARS = 300

#: Split after ., ! or ? when followed by whitespace, keeping the punctuation.
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def extract_video_id(url: str) -> str | None:
    """Pull a YouTube video id out of the common URL shapes.

    Accepts ``watch?v=``, ``youtu.be/``, ``/embed/``, ``/shorts/`` and
    ``/live/``.
    """
    parsed = urlparse(url.strip())
    host = (parsed.hostname or "").lower()

    if host == "youtu.be":
        candidate = parsed.path.lstrip("/").split("/")[0]
        return candidate if _VIDEO_ID.match(candidate) else None

    if host in _QUERY_HOSTS:
        query_id = parse_qs(parsed.query).get("v", [None])[0]
        if query_id:
            return query_id

        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in _PATH_PREFIXES:
            candidate = parts[1][:11]
            return candidate if _VIDEO_ID.match(candidate) else None

    return None


def _sentences(text: str) -> list[str]:
    """Split a transcript into sentences, keeping terminal punctuation.

    The previous implementation split on the literal ``". "`` and then
    re-joined with ``". "`` after stripping dots, which dropped the final
    sentence's period and mangled ``Mr.``-style abbreviations.
    """
    return [s for s in _SENTENCE_END.split(text.strip()) if s]


def group_into_paragraphs(
    text: str,
    *,
    target_chars: int = PARAGRAPH_TARGET_CHARS,
) -> list[str]:
    """Greedily pack sentences into paragraphs of about ``target_chars``."""
    paragraphs: list[str] = []
    buffer: list[str] = []
    length = 0

    for sentence in _sentences(text):
        buffer.append(sentence)
        length += len(sentence) + 1
        if length >= target_chars:
            paragraphs.append(" ".join(buffer))
            buffer = []
            length = 0

    if buffer:
        paragraphs.append(" ".join(buffer))

    return paragraphs


def extract_youtube_transcript(
    url: str,
    lang_codes: tuple[str, ...] = DEFAULT_LANGS,
) -> list[dict]:
    """Fetch a YouTube transcript and emit it as paragraph blocks."""
    # Imported lazily so the pure URL/paragraph helpers in this module stay
    # importable (and unit-testable) without the transcript library present.
    from youtube_transcript_api import YouTubeTranscriptApi

    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError(f"Could not parse YouTube video id from: {url}")

    transcript = YouTubeTranscriptApi().fetch(video_id, languages=list(lang_codes))
    text = " ".join(snippet.text for snippet in transcript)

    return [
        {
            "type": "paragraph",
            "text": paragraph,
            # Transcripts carry no formatting — structured paragraphs are
            # all the editor needs to render them faithfully.
            "html": plain_text_to_html(paragraph),
        }
        for paragraph in group_into_paragraphs(text)
    ]
