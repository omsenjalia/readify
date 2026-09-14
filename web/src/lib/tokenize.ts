/**
 * Unicode-aware tokenization for RSVP (Hindi, Gujarati, English, …).
 */

function segmentWords(text: string): string[] {
  const normalized = text.replace(/\u00a0/g, " ").trim();
  if (!normalized) return [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
      const out: string[] = [];
      for (const { segment, isWordLike } of segmenter.segment(normalized)) {
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

  return normalized
    .split(/[\s\u200b\u200c\u200d\ufeff]+/u)
    .map((w) => w.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, ""))
    .filter(Boolean);
}

export function tokenizeText(text: string): string[] {
  return segmentWords(text);
}

export function chunkWords(words: string[], maxPerChunk = 80): string[][] {
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
