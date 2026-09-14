/**
 * Optimal Recognition Point (ORP) — Unicode-aware.
 *
 * Classic Spritz-style ORP is tuned for Latin orthography. For scripts like
 * Devanagari (Hindi) and Gujarati we still highlight a fixation point, but we
 * count *grapheme clusters* (user-perceived characters) and treat any letter
 * (\\p{L}) as a content character — not only ASCII \\w.
 */

function graphemesOf(word: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word)].map(
        (s) => s.segment,
      );
    } catch {
      // fall through
    }
  }
  // Code-point iteration (better than UTF-16 code units for non-BMP)
  return Array.from(word);
}

/** True if the grapheme contains a letter or number (not pure punctuation). */
function isContentGrapheme(g: string): boolean {
  return /\p{L}|\p{N}/u.test(g);
}

/**
 * Index into the grapheme list where the ORP highlight should sit.
 * Same length bands as the original Latin heuristic, applied to graphemes.
 */
export function getORPIndex(word: string): number {
  const graphemes = graphemesOf(word);
  const contentCount = graphemes.filter(isContentGrapheme).length;
  if (contentCount <= 1) return 0;
  if (contentCount <= 5) return 1;
  if (contentCount <= 9) return 2;
  if (contentCount <= 13) return 3;
  return 4;
}

export function splitAtORP(word: string): {
  before: string;
  orp: string;
  after: string;
} {
  if (!word) return { before: "", orp: "", after: "" };

  const graphemes = graphemesOf(word);
  const target = getORPIndex(word);

  let contentSeen = 0;
  for (let i = 0; i < graphemes.length; i++) {
    if (isContentGrapheme(graphemes[i])) {
      if (contentSeen === target) {
        return {
          before: graphemes.slice(0, i).join(""),
          orp: graphemes[i],
          after: graphemes.slice(i + 1).join(""),
        };
      }
      contentSeen++;
    }
  }

  // Fallback: first grapheme
  return {
    before: "",
    orp: graphemes[0] ?? "",
    after: graphemes.slice(1).join(""),
  };
}
