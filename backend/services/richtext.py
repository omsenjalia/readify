"""Rich-text helpers shared by the extractors for the editing canvas.

Every source type ends up as `content_blocks` rows carrying both the RSVP
`words` and a sanitized, block-level `html` string so the Word-style editor
can show the document *as it was formatted* — headings, bold/italic spans
and lists included.

The module is deliberately pure (stdlib only): the web app owns its own
copies of these routines (`web/src/lib/editor.ts`), and the two test suites
pin the behaviour each side depends on.
"""

from __future__ import annotations

import re
from collections import Counter
from html.parser import HTMLParser

#: Tags written by the extractors / renderers; also the editor allowlist
#: (keep in sync with `ALLOWED_TAGS` in web/src/lib/editor.ts).
BLOCK_TAGS = frozenset(
    {
        "p",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "ul",
        "ol",
        "tr",
        "table",
        "blockquote",
        "pre",
        "hr",
        "figure",
        "section",
        "article",
        "body",
    }
)

#: Self-closing tags (no end tag follows).
VOID_TAGS = frozenset({"br", "hr", "img", "wbr", "meta", "link", "input"})

#: Containers whose text content is code/markup, never document prose.
_SKIP_TEXT_TAGS = frozenset({"script", "style", "head", "template", "noscript"})

_TAG_RE = re.compile(r"<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*)>")


def escape(text: str) -> str:
    """Escape the five specials — same entities the web app emits
    (`&#39;` for apostrophes, not Python's default `&#x27;`) so editor and
    backend HTML stay byte-comparable."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def plain_text_to_html(text: str) -> str:
    """Blank-line-separated paragraphs -> `<p>` blocks; newlines -> `<br>`.

    Everything is escaped, so raw text or OCR output can never introduce
    markup of its own.
    """
    normalized = text.replace("\r\n", "\n")
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", normalized) if p.strip()]
    rendered: list[str] = []
    for paragraph in paragraphs:
        inner = escape(paragraph).replace("\n", "<br>\n")
        rendered.append(f"<p>{inner}</p>")
    return "\n".join(rendered)


class _TextExtractor(HTMLParser):
    """Collect readable text: block boundaries become newlines."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:  # noqa: ARG002
        if tag in _SKIP_TEXT_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        if tag in BLOCK_TAGS or tag == "br":
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TEXT_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if self._skip_depth:
            return
        if tag in BLOCK_TAGS:
            self._chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            self._chunks.append(data)

    def text(self) -> str:
        joined = "".join(self._chunks)
        joined = re.sub(r"[ \t]+\n", "\n", joined)
        joined = re.sub(r"\n{3,}", "\n\n", joined)
        return joined.strip()


def html_to_text(html: str) -> str:
    """Plain text out of rich text (tokenization + empty-block checks)."""
    parser = _TextExtractor()
    try:
        parser.feed(html)
        parser.close()
    except Exception:  # noqa: BLE001 - malformed input must not kill a save
        # Fall back to a naive strip so callers still get *something*.
        return re.sub(r"<[^>]+>", " ", html).strip()
    return parser.text()


def _is_block_level(chunk: str) -> bool:
    m = re.match(r"<\s*([a-zA-Z][a-zA-Z0-9]*)", chunk)
    return bool(m and m.group(1).lower() in BLOCK_TAGS)


def split_top_level_html(html: str) -> list[str]:
    """Split concatenated HTML into top-level element chunks.

    Mirrors `splitTopLevelHtml` in the web app: each complete top-level
    element becomes its own chunk (so headings/paragraphs/lists map to
    individual content blocks), raw inline leftovers are wrapped in `<p>`,
    and void tags are self-contained. Linear in the input length.
    """
    chunks: list[str] = []
    depth = 0
    i = 0
    pending_start = 0
    element_start = -1

    def flush_pending(upto: int) -> None:
        nonlocal pending_start
        raw = html[pending_start:upto].strip()
        if raw:
            chunks.append(raw if _is_block_level(raw) else f"<p>{raw}</p>")
        pending_start = upto

    while i < len(html):
        lt = html.find("<", i)
        if lt == -1:
            flush_pending(len(html))
            break

        m = _TAG_RE.match(html, lt)
        if not m:
            i = lt + 1  # stray `<` — stays part of the pending raw text
            continue

        closing = m.group(1) == "/"
        tag = m.group(2).lower()
        raw_attrs = m.group(3)
        self_closing = raw_attrs.rstrip().endswith("/")

        # Drop dangerous containers with their content (belt and braces —
        # extractor output is generated, never user-controlled HTML).
        if tag in _SKIP_TEXT_TAGS:
            if not closing:
                if depth == 0:
                    flush_pending(lt)
                close = re.search(rf"</{tag}\s*>", html[m.end() :], re.IGNORECASE)
                i = m.end() + close.end() if close else len(html)
                if depth == 0:
                    pending_start = i
            else:
                if depth == 0:
                    flush_pending(lt)
                    pending_start = m.end()
                i = m.end()
            continue

        is_void = tag in VOID_TAGS or self_closing

        if depth == 0:
            flush_pending(lt)
            element_start = lt

        i = m.end()
        if closing:
            depth = max(0, depth - 1)
        elif not is_void:
            depth += 1

        if depth == 0 and element_start >= 0:
            chunk = html[element_start:i].strip()
            if chunk:
                chunks.append(chunk)
            element_start = -1
            pending_start = i

    if element_start >= 0:
        chunk = html[element_start:].strip()
        if chunk:
            chunks.append(chunk)
    else:
        flush_pending(len(html))
    return chunks


# -------------------------------------------------------------------------- #
# PDF page dictionaries (PyMuPDF `page.get_text("dict")`)                    #
# -------------------------------------------------------------------------- #

#: Bit flags reported by MuPDF spans (verified against base-14 fonts):
#: 16 = bold, 2 = italic.
_SPAN_BOLD = 16
_SPAN_ITALIC = 2

_BOLD_FONT_MARKERS = ("bold", "black", "heavy", "semibold", "demibold", "medium")


def _span_style(span: dict) -> tuple[bool, bool]:
    flags = int(span.get("flags", 0) or 0)
    font = str(span.get("font", "")).lower()
    bold = bool(flags & _SPAN_BOLD) or any(marker in font for marker in _BOLD_FONT_MARKERS)
    italic = bool(flags & _SPAN_ITALIC) or "italic" in font or "oblique" in font
    return bold, italic


def _char_weighted_size(block: dict, default: float) -> float:
    """Most characters in the block share this font size."""
    weights: Counter[float] = Counter()
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            size = round(float(span.get("size", 0) or 0), 1)
            weights[size] += len(span.get("text", ""))
    if not weights:
        return default
    return weights.most_common(1)[0][0]


def pdf_dict_to_html(page_dict: dict, *, body_size: float | None = None) -> str:
    """Render a PyMuPDF text-page dictionary as block-level HTML.

    Visual lines inside a paragraph join with spaces, bold/italic spans keep
    their emphasis, and short lines set noticeably larger than the page's
    body size become headings — the formatting the original PDF carried.
    """
    text_blocks = [b for b in page_dict.get("blocks", []) if b.get("type", 0) == 0]
    if not text_blocks:
        return ""

    if body_size is None:
        page_weights: Counter[float] = Counter()
        for block in text_blocks:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    size = round(float(span.get("size", 0) or 0), 1)
                    page_weights[size] += len(span.get("text", ""))
        if not page_weights:
            return ""
        body_size = page_weights.most_common(1)[0][0]
    if body_size <= 0:
        body_size = 12.0

    parts: list[str] = []
    for block in text_blocks:
        lines = block.get("lines", [])
        if not lines:
            continue
        rendered_lines: list[str] = []
        for line in lines:
            rendered_spans: list[str] = []
            for span in line.get("spans", []):
                text = span.get("text", "")
                if not text:
                    continue
                bold, italic = _span_style(span)
                chunk = escape(text)
                if bold and italic:
                    chunk = f"<strong><em>{chunk}</em></strong>"
                elif bold:
                    chunk = f"<strong>{chunk}</strong>"
                elif italic:
                    chunk = f"<em>{chunk}</em>"
                rendered_spans.append(chunk)
            # MuPDF keeps inter-span spacing inside the span strings, so
            # concatenation is exact; visual lines are stripped at the edges
            # and joined with one space (line breaks are layout, not prose).
            rendered_line = "".join(rendered_spans).strip()
            if rendered_line:
                rendered_lines.append(rendered_line)
        inner = " ".join(rendered_lines).strip()
        if not inner:
            continue

        size = _char_weighted_size(block, body_size)
        ratio = size / body_size
        if ratio >= 1.5:
            tag = "h1"
        elif ratio >= 1.28:
            tag = "h2"
        elif ratio >= 1.12:
            tag = "h3"
        else:
            tag = "p"
        parts.append(f"<{tag}>{inner}</{tag}>")

    return "".join(parts)
