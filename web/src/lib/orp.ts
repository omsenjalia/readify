/**
 * Optimal Recognition Point (ORP) — Unicode-aware.
 * Uses grapheme clusters and Unicode letters so Devanagari / Gujarati highlight correctly.
 */

function graphemesOf(word: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      return [
        ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          word,
        ),
      ].map((s) => s.segment);
    } catch {
      // fall through
    }
  }
  return Array.from(word);
}

function isContentGrapheme(g: string): boolean {
  return /\p{L}|\p{N}/u.test(g);
}

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

  return {
    before: "",
    orp: graphemes[0] ?? "",
    after: graphemes.slice(1).join(""),
  };
}
