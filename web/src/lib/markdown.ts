/**
 * Lightweight Markdown → plain text for RSVP.
 * Strips common syntax so the reader shows words, not `**bold**` or `# headings`.
 */

/** True when the text looks like Markdown rather than plain prose. */
export function looksLikeMarkdown(text: string): boolean {
  const sample = text.slice(0, 4000);
  const signals = [
    /^#{1,6}\s+\S/m,
    /\*\*[^*]+\*\*/,
    /__[^_]+__/,
    /(?<!\*)\*[^*\n]+\*(?!\*)/,
    /^\s*[-*+]\s+\S/m,
    /^\s*\d+\.\s+\S/m,
    /\[.+?\]\(.+?\)/,
    /!\[.*?\]\(.+?\)/,
    /^```/m,
    /^>\s+\S/m,
    /^\s*---\s*$/m,
    /`[^`]+`/,
  ];
  let hits = 0;
  for (const re of signals) {
    if (re.test(sample)) hits++;
  }
  return hits >= 2 || /^#{1,6}\s+\S/m.test(sample) || /^```/m.test(sample);
}

/** Convert Markdown source to plain text suitable for tokenization. */
export function markdownToPlainText(md: string): string {
  let text = md.replace(/\r\n/g, "\n");

  text = text.replace(/```[\w-]*\n([\s\S]*?)```/g, "\n$1\n");
  text = text.replace(/~~~[\w-]*\n([\s\S]*?)~~~/g, "\n$1\n");
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");
  text = text.replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^(.+)\n[=-]{2,}\s*$/gm, "$1\n");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, "\n");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/^\s*\[[ xX]\]\s+/gm, "");
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  text = text.replace(/___([^_]+)___/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1");
  text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*$/gm, "");
  text = text.replace(/^\s*\|(.+)\|\s*$/gm, (_, cells: string) =>
    cells
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .join(", "),
  );
  text = text.replace(/<\/?[^>]+>/g, " ");
  text = text.replace(/\[\^[^\]]+\]/g, "");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");
  return text.trim();
}

/**
 * Prepare text for RSVP. When forceMarkdown is true (Pasted Text toggle or
 * .md upload), always strip MD. Otherwise auto-detect.
 */
export function prepareReadableText(
  input: string,
  forceMarkdown = false,
): string {
  const trimmed = input.replace(/^\uFEFF/, "");
  if (forceMarkdown || looksLikeMarkdown(trimmed)) {
    return markdownToPlainText(trimmed);
  }
  return trimmed;
}
