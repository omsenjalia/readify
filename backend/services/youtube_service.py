from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApi,
)

from services.text_service import tokenize_words

# Prefer these when available; if none match, fall back to any transcript.
_PREFERRED_LANGS = (
    "en",
    "en-US",
    "en-GB",
    "hi",  # Hindi
    "gu",  # Gujarati
    "mr",  # Marathi
    "bn",  # Bengali
    "ta",  # Tamil
    "te",  # Telugu
    "kn",  # Kannada
    "ml",  # Malayalam
    "pa",  # Punjabi
    "ur",  # Urdu
    "es",
    "fr",
    "de",
    "pt",
    "ar",
    "zh-Hans",
    "zh-Hant",
    "ja",
    "ko",
)


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
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in {"embed", "shorts", "live", "v"}:
            return parts[1][:11] or None
    return None


def extract_youtube_transcript(
    url: str,
    lang_codes: tuple[str, ...] = _PREFERRED_LANGS,
) -> list[dict]:
    """Fetch a YouTube transcript in any available language.

    Tries preferred languages first (English + major Indic + others), then
    any manually created transcript, then any auto-generated one.
    """
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError(f"Could not parse YouTube video id from: {url}")

    api = YouTubeTranscriptApi()
    text: str | None = None

    # 1) Preferred language list
    try:
        fetched = api.fetch(video_id, languages=list(lang_codes))
        text = " ".join(snippet.text for snippet in fetched)
    except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable):
        text = None
    except Exception:
        text = None

    # 2) Enumerate whatever exists and pick the first usable track
    if not text:
        try:
            listing = api.list(video_id)
            transcript = None
            try:
                transcript = listing.find_transcript(list(lang_codes))
            except Exception:
                try:
                    transcript = listing.find_manually_created_transcript(
                        list(lang_codes)
                    )
                except Exception:
                    try:
                        # any generated transcript
                        transcript = next(iter(listing))
                    except Exception as exc:
                        raise ValueError(
                            f"No transcript available for video {video_id}"
                        ) from exc
            fetched = transcript.fetch()
            text = " ".join(
                (getattr(s, "text", None) or s.get("text", ""))  # type: ignore[union-attr]
                for s in fetched
            )
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not fetch transcript for video {video_id}: {exc}"
            ) from exc

    if not text or not text.strip():
        raise ValueError(f"Empty transcript for video {video_id}")

    # Chunk by approximate character budget so Indic text (often fewer spaces
    # per "idea") still forms readable paragraphs.
    words = tokenize_words(text)
    paragraphs: list[dict] = []
    buffer: list[str] = []
    budget = 0
    for w in words:
        buffer.append(w)
        budget += len(w) + 1
        if budget >= 300:
            paragraphs.append(
                {"type": "paragraph", "text": " ".join(buffer)}
            )
            buffer = []
            budget = 0
    if buffer:
        paragraphs.append({"type": "paragraph", "text": " ".join(buffer)})
    return paragraphs
