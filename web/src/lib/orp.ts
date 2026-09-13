// Optimal Recognition Point (ORP).
//
// The ORP is the character inside a word at which the eyes should rest so
// the whole word can be recognized in a single fixation. Heuristics:
//   - len <= 1: 0
//   - len <= 5: 1
//   - len <= 9: 2
//   - len <= 13: 3
//   - else: 4

export function getORPIndex(word: string): number {
  const len = word.replace(/\W/g, "").length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

export function splitAtORP(word: string): {
  before: string;
  orp: string;
  after: string;
} {
  const target = getORPIndex(word);
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    if (/\w/.test(word[i])) {
      if (count === target) {
        return { before: word.slice(0, i), orp: word[i], after: word.slice(i + 1) };
      }
      count++;
    }
  }
  return { before: "", orp: word[0] ?? "", after: word.slice(1) };
}