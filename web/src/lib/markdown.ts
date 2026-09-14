/**
 * Lightweight Markdown → plain text for RSVP.
 *
 * No dependency: strips common syntax so readers see words, not `**bold**`
 * or `# headings`. Good enough for notes, READMEs, and blog-style MD.
 */

/** True when the text looks like Markdown rather than plain prose. */
export function looksLikeMarkdown(text: string): boolean {
  const sample = text.slice(0, 4000);
  const signals = [
    /^#{1,6}\s+\S/m, // headings
    /\*\*[^*]+\*\*/, // bold
    /__[^_]+__/,
    /(?<!\*)\*[^*\n]+\*(?!\*)/, // italic
    /^\s*[-*+]\s+\S/m, // unordered list
    /^\s*\d+\.\s+\S/m, // ordered list
    /\[.+?\]\(.+?\)/, // links
    /!\[.*?\]\(.+?\)/, // images
    /^```/m, // fenced code
    /^>\s+\S/m, // blockquote
    /^\s*---\s*$/m, // hr
    /`[^`]+`/, // inline code
  ];
  let hits = 0;
  for (const re of signals) {
    if (re.test(sample)) hits++;
  }
  return hits >= 2 || /^#{1,6}\s+\S/m.test(sample) || /^```/m.test(sample);
}

/**
 * Convert Markdown source to plain text suitable for tokenization.
 * Structure (headings, list items) becomes line breaks so words stay readable.
 */
export function markdownToPlainText(md: string): string {
  let text = md.replace(/\r\n/g, "\n");

  // Fenced code blocks → keep inner text, drop fences/language tags
  text = text.replace(/```[\w-]*\n([\s\S]*?)```/g, "\n$1\n");
  text = text.replace(/~~~[\w-]*\n([\s\S]*?)~~~/g, "\n$1\n");

  // Images → alt text
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Links → link text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");

  // Reference-style link definitions
  text = text.replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, "");

  // Headings
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Setext-style headings underlines
  text = text.replace(/^(.+)\n[=-]{2,}\s*$/gm, "$1\n");

  // Blockquotes
  text = text.replace(/^\s{0,3}>\s?/gm, "");

  // Horizontal rules
  text = text.replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, "\n");

  // List markers
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // Task list checkboxes
  text = text.replace(/^\s*\[[ xX]\]\s+/gm, "");

  // Bold / italic / strikethrough (order matters)
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  text = text.replace(/___([^_]+)___/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1");
  text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // Inline code
  text = text.replace(/`([^`]+)`/g, "$1");

  // Tables: drop alignment rows, keep cell text
  text = text.replace(/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*$/gm, "");
  text = text.replace(/^\s*\|(.+)\|\s*$/gm, (_, cells: string) =>
    cells
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .join(", "),
  );

  // HTML tags (simple)
  text = text.replace(/<\/?[^>]+>/g, " ");

  // Footnote markers
  text = text.replace(/\[\^[^\]]+\]/g, "");

  // Collapse excess whitespace
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");

  return text.trim();
}

/**
 * If the input looks like Markdown, convert to plain text; otherwise return as-is.
 * Always safe to call before tokenization.
 */
export function prepareReadableText(input: string, forceMarkdown = false): string {
  const trimmed = input.replace(/^\uFEFF/, ""); // BOM
  if (forceMarkdown || looksLikeMarkdown(trimmed)) {
    return markdownToPlainText(trimmed);
  }
  return trimmed;
}
