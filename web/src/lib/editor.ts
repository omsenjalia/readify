/**
 * Editor document model — the bridge between `content_blocks` rows and the
 * Word-style editing canvas (`/edit/[slug]`).
 *
 * The canvas is a single contentEditable surface whose top-level children
 * are either rich-text elements (paragraphs, headings, lists…) or atomic
 * `<figure data-image-path>` placeholders for document images. On save the
 * DOM is serialized into {@link EditorBlock}s — runs of adjacent rich text
 * become one text block (words are tokenized by the API), figures become
 * image blocks in document order.
 *
 * Everything here is pure so it can run in Route Handlers, Server
 * Components and the browser alike; DOM walking stays in the component.
 */

import type { ContentBlock } from "@/types";
import { resolveImageUrl, toImagePath } from "@/lib/images";
import { tokenizeText } from "@/lib/tokenize";

/* ------------------------------------------------------------------ */
/* Editor block payload (client -> PUT /api/documents/[id]/content)    */
/* ------------------------------------------------------------------ */

export type EditorBlock =
  | { type: "text"; html: string }
  | { type: "image"; image_path: string };

/** One serialized top-level canvas child. */
export type CanvasPart =
  | { kind: "figure"; path: string }
  | { kind: "html"; html: string };

/* ------------------------------------------------------------------ */
/* Tag matching                                                        */
/* ------------------------------------------------------------------ */

/**
 * One sticky matcher shared by every walker below. Callers set
 * `lastIndex` to the position of a `<` before `exec` — this keeps all
 * passes linear in the input length (slicing per tag would be quadratic).
 */
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/y;

interface TagMatch {
  closing: boolean;
  tag: string;
  attrs: string;
  selfClosing: boolean;
  end: number;
}

function matchTagAt(html: string, lt: number): TagMatch | null {
  TAG_RE.lastIndex = lt;
  const m = TAG_RE.exec(html);
  if (!m) return null;
  return {
    closing: m[1] === "/",
    tag: m[2].toLowerCase(),
    attrs: m[3],
    selfClosing: m[3].trim().endsWith("/"),
    end: m.index + m[0].length,
  };
}

/* ------------------------------------------------------------------ */
/* Escaping                                                            */
/* ------------------------------------------------------------------ */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
  reg: "®",
  trade: "™",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (full, body: string) => {
      if (body.startsWith("#")) {
        const code =
          body[1] === "x" || body[1] === "X"
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : full;
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? full;
    },
  );
}

/* ------------------------------------------------------------------ */
/* Sanitizer                                                           */
/* ------------------------------------------------------------------ */

/** The only tags that may appear in sanitized rich text. */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
]);

/** Dangerous containers whose contents are dropped entirely. */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "head",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
  "noscript",
]);

/** Tags with no end tag — emitted void, never pushed on the open stack. */
const VOID_TAGS = new Set(["br", "hr"]);

/** Only these attributes survive; everything else (class, style, id, data-*) is stripped. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  ol: new Set(["start"]),
};

function safeHref(value: string): string | null {
  const url = value.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^mailto:/i.test(url)) return url;
  // Same-site absolute paths and in-page anchors only — never `//host`
  // (protocol-relative) which would leave the origin.
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url.startsWith("#")) return url;
  return null;
}

/**
 * Allowlist sanitizer for rich text in the editing canvas and preview.
 *
 * Walks the markup tag by tag: unknown tags are unwrapped (dangerous ones
 * are dropped with their content), every attribute except a tiny per-tag
 * allowlist is stripped, `href`s must be http(s)/mailto/same-site, and any
 * stray `<` that does not form a tag is escaped. The result only ever
 * contains {@link ALLOWED_TAGS}.
 */
export function sanitizeEditorHtml(html: string): string {
  let out = "";
  let i = 0;
  /** Open non-void allowed tags awaiting a matching close. */
  const open: string[] = [];

  const closeUpTo = (tag: string) => {
    const idx = open.lastIndexOf(tag);
    if (idx === -1) return;
    for (let j = open.length - 1; j >= idx; j--) {
      out += `</${open[j]}>`;
      open.pop();
    }
  };

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    if (lt > i) out += html.slice(i, lt);

    const m = matchTagAt(html, lt);
    if (!m) {
      // Stray `<` — literal text.
      out += "&lt;";
      i = lt + 1;
      continue;
    }
    i = m.end;

    if (DROP_WITH_CONTENT.has(m.tag)) {
      if (!m.closing) {
        const closeRe = new RegExp(`</${m.tag}\\s*>`, "i");
        const cm = closeRe.exec(html.slice(i));
        i = cm ? i + cm.index + cm[0].length : html.length;
      }
      continue; // open and close tags both vanish
    }

    if (!ALLOWED_TAGS.has(m.tag)) {
      continue; // unwrap: drop the tags, keep children
    }

    if (VOID_TAGS.has(m.tag) || m.selfClosing) {
      if (!m.closing) out += `<${m.tag}>`;
      continue;
    }

    if (m.closing) {
      if (open.includes(m.tag)) closeUpTo(m.tag);
      continue;
    }

    // Opening tag: keep only allow-listed attributes.
    let attrs = "";
    const allow = ALLOWED_ATTRS[m.tag];
    if (allow) {
      const attrRe =
        /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
      let am: RegExpExecArray | null;
      while ((am = attrRe.exec(m.attrs))) {
        const name = am[1].toLowerCase();
        if (!allow.has(name)) continue;
        const value = decodeEntities(am[3] ?? am[4] ?? am[5] ?? "");
        if (name === "href") {
          const href = safeHref(value);
          if (!href) continue;
          attrs += ` href="${href.replace(/"/g, "&quot;")}"`;
        } else if (name === "start") {
          if (/^\d{1,6}$/.test(value)) attrs += ` start="${value}"`;
        } else {
          attrs += ` ${name}="${value.replace(/"/g, "&quot;")}"`;
        }
      }
    }

    open.push(m.tag);
    out += `<${m.tag}${attrs}>`;
  }

  for (let j = open.length - 1; j >= 0; j--) out += `</${open[j]}>`;
  return out;
}

/* ------------------------------------------------------------------ */
/* Plain text                                                          */
/* ------------------------------------------------------------------ */

const BLOCK_BOUNDARY = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "pre",
  "tr",
  "table",
  "ul",
  "ol",
  "hr",
  "br",
  "figure",
]);

/**
 * Extract readable plain text from rich text (for tokenization and
 * empty-block detection). Block boundaries become newlines so paragraph
 * structure survives into the RSVP tokenizer.
 */
export function htmlToPlainText(html: string): string {
  let text = "";
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      text += html.slice(i);
      break;
    }
    if (lt > i) text += html.slice(i, lt);

    const m = matchTagAt(html, lt);
    if (!m) {
      text += "<";
      i = lt + 1;
      continue;
    }
    i = m.end;

    if (DROP_WITH_CONTENT.has(m.tag) && !m.closing) {
      const closeRe = new RegExp(`</${m.tag}\\s*>`, "i");
      const cm = closeRe.exec(html.slice(i));
      i = cm ? i + cm.index + cm[0].length : html.length;
      continue;
    }
    if (BLOCK_BOUNDARY.has(m.tag)) text += "\n";
  }

  return decodeEntities(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Canvas <-> blocks                                                   */
/* ------------------------------------------------------------------ */

/** Tags browsers emit as top-level block children (used when wrapping inline leftovers). */
const HTML_BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "blockquote",
  "pre",
  "hr",
  "figure",
  "div",
  "table",
]);

/** True when a serialized top-level element is already a block-level node. */
export function isBlockLevelElement(html: string): boolean {
  const m = /^<\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(html);
  return !!m && HTML_BLOCK_TAGS.has(m[1].toLowerCase());
}

function figureHtml(path: string, src: string): string {
  return (
    `<figure data-image-path="${path.replace(/"/g, "&quot;")}" contenteditable="false">` +
    `<img src="${src.replace(/"/g, "&quot;")}" alt="Document figure" loading="lazy" />` +
    `</figure>`
  );
}

/**
 * Render content_blocks into the initial editing canvas.
 *
 * Text blocks use their stored `html` (the original document's formatting);
 * legacy rows without it fall back to a plain paragraph built from `words`.
 * Image blocks become non-editable figures pointing at signed URLs.
 */
export function blocksToCanvasHtml(
  blocks: ContentBlock[],
  signed: Map<string, string>,
): string {
  const ordered = [...blocks].sort((a, b) => a.position - b.position);
  let out = "";
  for (const block of ordered) {
    if (block.type === "image") {
      const path = toImagePath(block.image_url);
      if (!path) continue;
      const src = resolveImageUrl(block.image_url, signed) ?? "";
      out += figureHtml(path, src);
      continue;
    }
    const html = (block.html ?? "").trim();
    if (html) {
      out += sanitizeEditorHtml(html);
      continue;
    }
    const words = block.words ?? [];
    if (words.length) {
      out += `<p>${escapeHtml(words.join(" "))}</p>`;
    }
  }
  return out;
}

/**
 * Group serialized canvas children back into blocks for saving:
 * consecutive rich-text parts merge into one text block (splitting happens
 * only at figures), figures become image blocks in document order.
 */
export function canvasPartsToBlocks(parts: CanvasPart[]): EditorBlock[] {
  const blocks: EditorBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const html = sanitizeEditorHtml(buffer.join(""));
    buffer = [];
    const plain = htmlToPlainText(html);
    const keep = plain.trim().length > 0 || /<hr\s*>/i.test(html);
    if (keep) blocks.push({ type: "text", html });
  };

  for (const part of parts) {
    if (part.kind === "figure") {
      flush();
      const path = part.path.trim();
      if (path) blocks.push({ type: "image", image_path: path });
    } else {
      buffer.push(part.html);
    }
  }
  flush();
  return blocks;
}

/**
 * Split a full-document HTML string into top-level element chunks
 * (`<h1>…</h1><p>…</p>` -> `["<h1>…</h1>", "<p>…</p>"]`), so each formatted
 * element becomes its own content block. Stray inline text is wrapped in a
 * paragraph. Mirrors the backend's `services.richtext.split_top_level_html`.
 */
export function splitTopLevelHtml(html: string): string[] {
  const chunks: string[] = [];
  let depth = 0;
  let i = 0;
  /** Start of raw content not yet examined (between top-level elements). */
  let pendingStart = 0;
  /** Index of the `<` that opened the current top-level element, if any. */
  let elementStart = -1;

  const flushPending = (upto: number) => {
    const raw = html.slice(pendingStart, upto).trim();
    if (raw) chunks.push(isBlockLevelElement(raw) ? raw : `<p>${raw}</p>`);
    pendingStart = upto;
  };

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      flushPending(html.length);
      break;
    }

    const m = matchTagAt(html, lt);
    if (!m) {
      i = lt + 1; // stray `<` — remains part of the pending raw text
      continue;
    }

    // Dangerous containers vanish with their content (input is normally
    // already trusted — this is belt and braces for pasted/legacy HTML).
    if (DROP_WITH_CONTENT.has(m.tag) && !m.closing) {
      if (depth === 0) flushPending(lt);
      const closeRe = new RegExp(`</${m.tag}\\s*>`, "i");
      const cm = closeRe.exec(html.slice(m.end));
      i = cm ? m.end + cm.index + cm[0].length : html.length;
      if (depth === 0) pendingStart = i;
      continue;
    }
    if (DROP_WITH_CONTENT.has(m.tag) && m.closing) {
      if (depth === 0) {
        flushPending(lt);
        pendingStart = m.end;
      }
      i = m.end;
      continue;
    }

    const isVoid = VOID_TAGS.has(m.tag) || m.selfClosing;

    if (depth === 0) {
      // Raw text sitting before this element becomes its own chunk.
      flushPending(lt);
      elementStart = lt;
    }

    i = m.end;
    if (m.closing) {
      depth = Math.max(0, depth - 1);
    } else if (!isVoid) {
      depth += 1;
    }

    if (depth === 0 && elementStart >= 0) {
      const chunk = html.slice(elementStart, i).trim();
      if (chunk) chunks.push(chunk);
      elementStart = -1;
      pendingStart = i;
    }
  }

  if (elementStart >= 0) {
    // Unclosed top-level element — keep whatever we saw.
    const chunk = html.slice(elementStart).trim();
    if (chunk) chunks.push(chunk);
  } else {
    flushPending(html.length);
  }
  return chunks;
}

/* ------------------------------------------------------------------ */
/* Save payload validation (server)                                    */
/* ------------------------------------------------------------------ */

/** Hard caps — generous for books, hostile to abuse. */
export const MAX_BLOCKS = 10_000;
export const MAX_HTML_CHARS = 500_000;
export const MAX_IMAGE_PATH_CHARS = 512;

/** A text block that has passed sanitization, with its RSVP words. */
export interface SavedTextBlock {
  type: "text";
  html: string;
  words: string[];
}

/** An image block whose path is proven to live under this document. */
export interface SavedImageBlock {
  type: "image";
  image_path: string;
}

export type SavedBlock = SavedTextBlock | SavedImageBlock;

export type ValidateResult =
  | { ok: true; blocks: SavedBlock[] }
  | { ok: false; error: string };

/**
 * Validate + sanitize the editor's `{ blocks }` payload for a given
 * document. Runs server-side on every autosave: HTML goes through the
 * allowlist sanitizer, words are re-tokenized from the sanitized text, and
 * image paths must resolve to storage keys under `{documentId}/` so a
 * malicious client can never point a figure at another document's files.
 *
 * Text blocks whose content is empty (after sanitizing) are dropped —
 * users deleting paragraphs must not leave junk rows behind.
 */
export function validateEditorPayload(
  raw: unknown,
  documentId: string,
): ValidateResult {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "blocks must be an array" };
  }
  if (raw.length > MAX_BLOCKS) {
    return {
      ok: false,
      error: `Too many blocks (max ${MAX_BLOCKS})`,
    };
  }

  const prefix = `${documentId}/`;
  const blocks: SavedBlock[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: `Block ${i} is not an object` };
    }
    const candidate = item as { type?: unknown; html?: unknown; image_path?: unknown };

    if (candidate.type === "image") {
      if (typeof candidate.image_path !== "string") {
        return { ok: false, error: `Image block ${i} is missing image_path` };
      }
      // Accept a path, or any stored/signed URL shape that normalizes to one.
      const path = toImagePath(candidate.image_path) ?? candidate.image_path.trim();
      if (
        !path.startsWith(prefix) ||
        path.length > MAX_IMAGE_PATH_CHARS ||
        !/^[\w.\-/]+$/.test(path) ||
        path.includes("..")
      ) {
        return {
          ok: false,
          error: `Image block ${i} points outside this document`,
        };
      }
      blocks.push({ type: "image", image_path: path });
      continue;
    }

    if (candidate.type !== "text") {
      return { ok: false, error: `Block ${i} has an unknown type` };
    }
    if (typeof candidate.html !== "string") {
      return { ok: false, error: `Text block ${i} is missing html` };
    }
    if (candidate.html.length > MAX_HTML_CHARS) {
      return {
        ok: false,
        error: `Text block ${i} is too large (max ${MAX_HTML_CHARS} chars)`,
      };
    }

    const html = sanitizeEditorHtml(candidate.html);
    const plain = htmlToPlainText(html);
    const keep = plain.trim().length > 0 || /<hr\s*>/i.test(html);
    if (!keep) continue;

    blocks.push({ type: "text", html, words: tokenizeText(plain) });
  }

  return { ok: true, blocks };
}
