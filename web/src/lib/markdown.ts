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
  // Markdown table separator rows: `|---|---|`, `--- | ---`, `:--|--:`.
  // The previous pattern required a trailing `|` segment after the last
  // dash group, so a normal `|---|---|` separator never matched and leaked
  // into the reading stream as a literal "---, ---" line.
  text = text.replace(
    /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/gm,
    "",
  );
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

/* ------------------------------------------------------------------ */
/* Markdown -> HTML (editor)                                           */
/*                                                                     */
/* The upload path keeps the *formatted* document for the editing      */
/* canvas while `markdownToPlainText` still feeds the RSVP stream.     */
/* Everything is escaped before inline transforms run, so the output   */
/* never carries raw user HTML; the API sanitizes again on save.       */
/* ------------------------------------------------------------------ */

function escapeHtmlMd(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Same link policy as `lib/editor.ts`: http(s), mailto, same-site, anchors. */
function safeMdUrl(url: string): string | null {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^mailto:/i.test(u)) return u;
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (u.startsWith("#")) return u;
  return null;
}

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Inline Markdown (emphasis, links, code) over already-escaped text. */
function inlineMarkdown(raw: string): string {
  let text = escapeHtmlMd(raw);

  // Pull code spans out first so their contents survive untouched.
  const codeSpans: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code: string) => {
    codeSpans.push(code);
    return `\u0000C${codeSpans.length - 1}\u0000`;
  });

  // Images degrade to their alt text — matching what the RSVP reader shows
  // (remote images are never fetched by the pipeline).
  text = text.replace(/!\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1");

  // Links — only URL shapes that pass the allowlist become <a>.
  text = text.replace(
    /\[([^\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)\)/g,
    (_, label: string, url: string) => {
      const href = safeMdUrl(decodeHtmlAttr(url));
      return href ? `<a href="${escapeHtmlMd(href)}">${label}</a>` : label;
    },
  );

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");

  return text.replace(/\u0000C(\d+)\u0000/g, (_, i: string) => {
    const code = codeSpans[Number(i)];
    return code === undefined ? "" : `<code>${code}</code>`;
  });
}

/** Markdown table separator row (`|---|:--:|`) — dropped, like in the reader. */
const TABLE_SEPARATOR =
  /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

/**
 * Render Markdown source as block-level HTML for the editing canvas:
 * headings, paragraphs, lists, blockquotes, code fences and horizontal
 * rules keep their formatting; tables flatten to comma lists exactly like
 * {@link markdownToPlainText} does for the reader, so editor and RSVP stay
 * in sync.
 */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let i = 0;

  const flushPara = () => {
    if (para.length === 0) return;
    const body = inlineMarkdown(para.join("\n")).replace(/\n/g, "<br>\n");
    out.push(`<p>${body}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks.
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      flushPara();
      const marker = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(marker)) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence (or EOF)
      out.push(`<pre><code>${escapeHtmlMd(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }

    // ATX headings.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMarkdown(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rules.
    if (/^ {0,3}([-*_])( *\1){2,} *$/.test(line)) {
      flushPara();
      out.push("<hr>");
      i++;
      continue;
    }

    // Blockquotes — recurse so nested formatting survives.
    if (/^ {0,3}>/.test(line)) {
      flushPara();
      const quoted: string[] = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) {
        quoted.push(lines[i].replace(/^ {0,3}>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${markdownToHtml(quoted.join("\n"))}</blockquote>`);
      continue;
    }

    // Markdown table rows — flatten like the reader does.
    if (TABLE_SEPARATOR.test(line) && line.trimStart().startsWith("|")) {
      flushPara();
      i++;
      continue;
    }
    if (/^ *\|.*\| *$/.test(line)) {
      flushPara();
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length) out.push(`<p>${inlineMarkdown(cells.join(", "))}</p>`);
      i++;
      continue;
    }

    // Unordered lists (with task checkboxes and lazy continuations).
    if (/^\s*[-*+]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        let item = lines[i]
          .replace(/^\s*[-*+]\s+/, "")
          .replace(/^\[[ xX]\]\s+/, "");
        i++;
        // Lazy continuation: indented follow-up lines belong to this item.
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*[-*+]\s+/.test(lines[i]) &&
          !/^\s*\d+[.)]\s+/.test(lines[i])
        ) {
          item += " " + lines[i].trim();
          i++;
        }
        items.push(`<li>${inlineMarkdown(item)}</li>`);
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered lists.
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*\d+[.)]\s+/, "");
        i++;
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*[-*+]\s+/.test(lines[i]) &&
          !/^\s*\d+[.)]\s+/.test(lines[i])
        ) {
          item += " " + lines[i].trim();
          i++;
        }
        items.push(`<li>${inlineMarkdown(item)}</li>`);
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Link definitions and footnote definitions — the reader drops them too.
    if (/^\s*\[[^\]]+\]:\s+\S+/.test(line) || /^\s*\[\^[^\]]+\]:/.test(line)) {
      flushPara();
      i++;
      continue;
    }

    para.push(line);
    i++;
  }

  flushPara();
  return out.join("\n");
}

/**
 * Plain text -> block HTML (each blank-line-separated paragraph becomes a
 * `<p>`; single newlines become `<br>`). Everything is escaped — raw text
 * uploads are shown literally, exactly as the reader tokenizes them.
 */
export function plainTextToHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => `<p>${escapeHtmlMd(p).replace(/\n/g, "<br>\n")}</p>`)
    .join("\n");
}
