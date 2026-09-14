/**
 * Unicode-aware tokenization for RSVP.
 *
 * Hindi, Gujarati, and most Indic scripts separate words with spaces, but
 * JavaScript's /\w/ is ASCII-only and naive .split(/\s/) drops punctuation
 * handling. Prefer Intl.Segmenter when available; fall back to Unicode
 * property escapes.
 */

function segmentWords(text: string): string[] {
  const normalized = text.replace(/\u00a0/g, " ").trim();
  if (!normalized) return [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
      const out: string[] = [];
      for (const { segment, isWordLike } of segmenter.segment(normalized)) {
        // isWordLike is true for letters/numbers in the locale; false for
        // pure punctuation/whitespace. Keep word-like segments only.
        if (isWordLike) {
          const t = segment.trim();
          if (t) out.push(t);
        }
      }
      if (out.length > 0) return out;
    } catch {
      // fall through
    }
  }

  // Fallback: split on whitespace / common punctuation, keep Unicode letters.
  return normalized
    .split(/[\s\u200b\u200c\u200d\ufeff]+/u)
    .map((w) => w.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, ""))
    .filter(Boolean);
}

/** Split raw document text into RSVP word tokens. */
export function tokenizeText(text: string): string[] {
  return segmentWords(text);
}

/** Chunk a flat word list into paragraph-sized arrays for storage. */
export function chunkWords(
  words: string[],
  maxPerChunk = 80,
): string[][] {
  const paragraphs: string[][] = [];
  let buf: string[] = [];
  for (const w of words) {
    buf.push(w);
    if (buf.length >= maxPerChunk) {
      paragraphs.push(buf);
      buf = [];
    }
  }
  if (buf.length) paragraphs.push(buf);
  return paragraphs;
}
