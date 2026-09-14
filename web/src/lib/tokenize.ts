import { isMathToken } from "@/lib/math";

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

/** Split preserving textbook equations as single tokens. */
export function tokenizeText(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Standalone equation line
    if (
      /[=]/.test(line) &&
      line.length <= 100 &&
      !line.endsWith(".") &&
      (line.match(/[A-Za-z]/g) || []).length < line.length * 0.55
    ) {
      out.push(line.replace(/\s*=\s*/g, " = ").replace(/\s+/g, " "));
      continue;
    }
    // Prose: still use segmenter, then glue "X = Y" pairs
    const words = segmentWords(line);
    let i = 0;
    while (i < words.length) {
      // Look ahead for Symbol = Expr patterns already split
      if (
        i + 2 < words.length &&
        words[i + 1] === "=" &&
        !words[i].endsWith(".")
      ) {
        // consume until a clear prose boundary
        let j = i + 2;
        const chunk = [words[i], "=", words[j]];
        j++;
        while (
          j < words.length &&
          chunk.join(" ").length < 80 &&
          /^[\dA-Za-zμΦφ∅Ω₀-₉()/.+\-*^·×]+$/.test(words[j])
        ) {
          chunk.push(words[j]);
          j++;
        }
        const joined = chunk.join(" ");
        if (isMathToken(joined) || chunk.length >= 3) {
          out.push(joined);
          i = j;
          continue;
        }
      }
      out.push(words[i]);
      i++;
    }
  }
  return out.length ? out : segmentWords(text);
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
