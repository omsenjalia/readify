// Reading progress helpers — placeholder.

export function pctComplete(currentWord: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  return Math.min(100, Math.round((currentWord / totalWords) * 100));
}

export function wordsPerMinute(msSpent: number, wordsRead: number): number {
  if (msSpent <= 0) return 0;
  return Math.round((wordsRead / (msSpent / 60000)) * 10) / 10;
}

export function estimatedSeconds(totalWords: number, wpm: number): number {
  if (wpm <= 0 || totalWords <= 0) return 0;
  return Math.round((totalWords / wpm) * 60);
}