from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str | None:
    """Pull a YouTube video id out of common URL shapes."""
    parsed = urlparse(url.strip())
    host = (parsed.hostname or "").lower()
    if host in {"youtu.be"}:
        return parsed.path.lstrip("/").split("/")[0] or None
    if host in {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
    }:
        qs = parse_qs(parsed.query).get("v", [None])[0]
        if qs:
            return qs
        # /embed/ID, /shorts/ID, /live/ID
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in {"embed", "shorts", "live", "v"}:
            return parts[1][:11] or None
    return None


def extract_youtube_transcript(
    url: str,
    lang_codes: tuple[str, ...] = ("en", "en-US", "en-GB"),
) -> list[dict]:
    """Fetch a YouTube transcript and emit it as paragraph blocks."""
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError(f"Could not parse YouTube video id from: {url}")

    api = YouTubeTranscriptApi()
    transcript = api.fetch(video_id, languages=list(lang_codes))
    text = " ".join(snippet.text for snippet in transcript)

    chunks = text.split(". ")
    paragraphs: list[dict] = []
    buffer: list[str] = []
    for chunk in chunks:
        buffer.append(chunk.strip(" ."))
        if len(" ".join(buffer)) >= 300:
            paragraphs.append({"type": "paragraph", "text": ". ".join(buffer)})
            buffer = []
    if buffer:
        paragraphs.append({"type": "paragraph", "text": ". ".join(buffer)})
    return paragraphs
