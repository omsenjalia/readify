// Optimal Recognition Point (ORP) — placeholder.
//
// The ORP is the character inside a word at which the eyes should rest so
// the whole word can be recognized in a single fixation. Heuristics that
// work well in practice:
//   - short words (< 3 chars): first character
//   - medium words: roughly 1/3 to 1/2 of the way in
//   - long words: drift left-of-center as length grows
// The real algorithm will be tuned against reading tests later.

export function orpIndex(word: string): number {
  if (word.length <= 0) return 0;
  if (word.length <= 3) return Math.min(1, word.length - 1);
  if (word.length <= 7) return Math.floor(word.length / 3);
  return Math.floor(word.length / 3) - 1;
}

export function orpOffset(word: string): number {
  return Math.max(0, orpIndex(word));
}