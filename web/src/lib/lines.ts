/**
 * Line Flow layout — pure geometry.
 *
 * Line Flow shows the whole current line while the focused word's ORP
 * character stays pinned to the exact centre of the stage: the text slides,
 * the eye does not. To do that, the flat RSVP item stream is packed into
 * display lines that fit the stage width.
 *
 * This module owns only the packing maths so it can be unit-tested without a
 * DOM. The measurement (canvas text metrics) and rendering live in
 * `hooks/useLineLayout.ts` and `components/reader/LineStage.tsx`.
 */

/** A display line: item indices `[start, end)` plus the laid-out width. */
export interface TextLine {
  start: number;
  end: number;
  width: number;
}

/** Anything with an item-index range — lines and image rows alike. */
export interface IndexRange {
  start: number;
  end: number;
}

/**
 * Greedily pack words into lines no wider than `maxWidth`.
 *
 * `wordWidths[i]` is the rendered width of item `i`; `spaceWidth` is added
 * between words on the same line. A word wider than the whole line gets a
 * line to itself (the stage will slide through it) so packing can never stall.
 *
 * Returns `[]` for an empty input.
 */
export function layoutLines(
  wordWidths: number[],
  spaceWidth: number,
  maxWidth: number,
): TextLine[] {
  if (!wordWidths.length || maxWidth <= 0) return [];

  const lines: TextLine[] = [];
  let start = 0;
  let width = 0;

  for (let i = 0; i < wordWidths.length; i++) {
    const w = wordWidths[i];
    const candidate = i === start ? w : width + spaceWidth + w;

    if (i > start && candidate > maxWidth) {
      lines.push({ start, end: i, width });
      start = i;
      width = w;
    } else {
      width = candidate;
    }
  }
  lines.push({ start, end: wordWidths.length, width });
  return lines;
}

/**
 * Map every item index to the row (line or image) that contains it.
 *
 * Built once per layout; row lookup is then O(1) on every RSVP tick
 * (up to ~13/s at 800 WPM), replacing a per-tick linear scan.
 */
export function buildLineIndex(rows: IndexRange[], total: number): Int32Array {
  const map = new Int32Array(total).fill(-1);
  for (let r = 0; r < rows.length; r++) {
    for (let i = rows[r].start; i < rows[r].end; i++) map[i] = r;
  }
  return map;
}

/**
 * Fallback packing by character budget, used until real text metrics are
 * available (first paint, or environments without canvas). Mirrors the
 * greedy shape of `layoutLines` with `width ≈ chars`.
 */
export function layoutLinesByChars(words: string[], maxChars: number): TextLine[] {
  return layoutLines(
    words.map((w) => w.length),
    1,
    Math.max(8, maxChars),
  );
}
