import { describe, expect, it } from "vitest";
import {
  blocksToCanvasHtml,
  canvasPartsToBlocks,
  escapeHtml,
  htmlToPlainText,
  isBlockLevelElement,
  sanitizeEditorHtml,
  splitTopLevelHtml,
} from "@/lib/editor";
import type { ContentBlock } from "@/types";

function block(partial: Partial<ContentBlock>): ContentBlock {
  return {
    id: "b1",
    document_id: "doc",
    position: 0,
    type: "text",
    words: null,
    image_url: null,
    needs_ocr: false,
    html: null,
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  } as ContentBlock;
}

describe("escapeHtml", () => {
  it("escapes the five specials", () => {
    expect(escapeHtml(`&<>"'`)).toEqual("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("sanitizeEditorHtml", () => {
  it("keeps formatting tags", () => {
    const html = '<h2>Title</h2><p><strong>b</strong> <em>i</em> <u>u</u></p>';
    expect(sanitizeEditorHtml(html)).toEqual(html);
  });

  it("keeps lists, quotes, links and hr", () => {
    const html =
      '<ul><li>one</li><li>two</li></ul><ol start="3"><li>three</li></ol>' +
      '<blockquote><p>quote</p></blockquote><p><a href="https://x.dev">x</a></p><hr>';
    expect(sanitizeEditorHtml(html)).toEqual(html);
  });

  it("strips script tags and their content", () => {
    expect(sanitizeEditorHtml('<p>a</p><script>alert(1)</script><p>b</p>')).toEqual(
      "<p>a</p><p>b</p>",
    );
    expect(sanitizeEditorHtml("<p>x<script>evil()</script>y</p>")).toEqual("<p>xy</p>");
  });

  it("strips style tags and content", () => {
    expect(sanitizeEditorHtml("<style>p{color:red}</style><p>ok</p>")).toEqual("<p>ok</p>");
  });

  it("strips event handlers, class and style attributes", () => {
    expect(
      sanitizeEditorHtml('<p class="x" style="color:red" onclick="hack()">hi</p>'),
    ).toEqual("<p>hi</p>");
  });

  it("drops javascript: hrefs but keeps safe ones", () => {
    expect(sanitizeEditorHtml('<a href="javascript:alert(1)">x</a>')).toEqual("<a>x</a>");
    expect(sanitizeEditorHtml('<a href="JAVASCRIPT:x">y</a>')).toEqual("<a>y</a>");
    expect(sanitizeEditorHtml('<a href="data:text/html,x">y</a>')).toEqual("<a>y</a>");
    expect(sanitizeEditorHtml('<a href="https://a.dev/p?q=1">y</a>')).toEqual(
      '<a href="https://a.dev/p?q=1">y</a>',
    );
    expect(sanitizeEditorHtml('<a href="/library">y</a>')).toEqual('<a href="/library">y</a>');
    expect(sanitizeEditorHtml('<a href="//evil.dev">y</a>')).toEqual("<a>y</a>");
  });

  it("unwraps unknown tags but keeps their children", () => {
    expect(sanitizeEditorHtml("<span>kept</span>")).toEqual("kept");
    expect(sanitizeEditorHtml("<div><p>kept</p></div>")).toEqual("<p>kept</p>");
    expect(sanitizeEditorHtml("<img src=x onerror=hack()>")).toEqual("");
  });

  it("escapes stray angle brackets", () => {
    expect(sanitizeEditorHtml("<p>1 < 2</p>")).toEqual("<p>1 &lt; 2</p>");
    expect(sanitizeEditorHtml("a <notatag")).toEqual("a &lt;notatag");
  });

  it("closes tags left open by the editor", () => {
    expect(sanitizeEditorHtml("<p><strong>unclosed")).toEqual("<p><strong>unclosed</strong></p>");
  });

  it("honours explicit close order mismatches", () => {
    expect(sanitizeEditorHtml("<p><strong>x</p></strong>")).toEqual(
      "<p><strong>x</strong></p>",
    );
  });

  it("keeps self-closing br", () => {
    expect(sanitizeEditorHtml("a<br/>b")).toEqual("a<br>b");
  });

  it("never lets a dropped tag leave its close behind", () => {
    expect(sanitizeEditorHtml("<iframe></iframe><p>ok</p>")).toEqual("<p>ok</p>");
    expect(sanitizeEditorHtml("<template><p>hidden</p></template>ok")).toEqual("ok");
  });
});

describe("htmlToPlainText", () => {
  it("joins inline content", () => {
    expect(htmlToPlainText("<p>Hello <strong>world</strong></p>")).toEqual(
      "Hello world",
    );
  });

  it("separates blocks with newlines", () => {
    expect(htmlToPlainText("<p>one</p><p>two</p>")).toEqual("one\n\ntwo");
    expect(htmlToPlainText("<h2>T</h2><p>b</p>")).toEqual("T\n\nb");
  });

  it("treats br as a newline", () => {
    expect(htmlToPlainText("<p>a<br>b</p>")).toEqual("a\nb");
  });

  it("decodes entities", () => {
    expect(htmlToPlainText("<p>a &amp; b &lt; c &#65;</p>")).toEqual("a & b < c A");
  });

  it("drops script content", () => {
    expect(htmlToPlainText("<p>a</p><script>var x</script>")).toEqual("a");
  });

  it("handles list items as lines", () => {
    expect(htmlToPlainText("<ul><li>a</li><li>b</li></ul>")).toEqual("a\n\nb");
  });
});

describe("splitTopLevelHtml", () => {
  it("splits sibling elements", () => {
    expect(splitTopLevelHtml("<h1>a</h1><p>b</p><p>c</p>")).toEqual([
      "<h1>a</h1>",
      "<p>b</p>",
      "<p>c</p>",
    ]);
  });

  it("keeps nested lists whole", () => {
    const html = "<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul><p>next</p>";
    expect(splitTopLevelHtml(html)).toEqual([
      "<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul>",
      "<p>next</p>",
    ]);
  });

  it("treats void tags as self-contained", () => {
    expect(splitTopLevelHtml("before<hr>after")).toEqual([
      "<p>before</p>",
      "<hr>",
      "<p>after</p>",
    ]);
    expect(splitTopLevelHtml("<p>a<br>b</p>")).toEqual(["<p>a<br>b</p>"]);
  });

  it("wraps stray inline text in a paragraph", () => {
    expect(splitTopLevelHtml("bare text")).toEqual(["<p>bare text</p>"]);
    expect(splitTopLevelHtml("<p>a</p>bare")).toEqual(["<p>a</p>", "<p>bare</p>"]);
  });

  it("returns [] for empty input", () => {
    expect(splitTopLevelHtml("")).toEqual([]);
    expect(splitTopLevelHtml("   ")).toEqual([]);
  });
});

describe("isBlockLevelElement", () => {
  it("recognises block tags", () => {
    expect(isBlockLevelElement("<p>x</p>")).toBe(true);
    expect(isBlockLevelElement('<h2 class="t">x</h2>')).toBe(true);
    expect(isBlockLevelElement("plain")).toBe(false);
    expect(isBlockLevelElement("<strong>x</strong>")).toBe(false);
  });
});

describe("blocksToCanvasHtml", () => {
  it("renders stored html as-is (sanitized)", () => {
    const html = blocksToCanvasHtml(
      [block({ position: 0, html: "<h2>Title</h2>", words: ["Title"] })],
      new Map(),
    );
    expect(html).toEqual("<h2>Title</h2>");
  });

  it("falls back to a paragraph of words for legacy blocks", () => {
    const html = blocksToCanvasHtml(
      [block({ position: 0, words: ["Hello", "world"] })],
      new Map(),
    );
    expect(html).toEqual("<p>Hello world</p>");
  });

  it("renders image figures with signed urls", () => {
    const path = "doc-1/img.png";
    const signed = new Map([[path, "https://cdn/x.png?sig=1"]]);
    const html = blocksToCanvasHtml(
      [
        block({ id: "a", position: 0, type: "image", image_url: path, words: null }),
      ],
      signed,
    );
    expect(html).toContain('data-image-path="doc-1/img.png"');
    expect(html).toContain('src="https://cdn/x.png?sig=1"');
    expect(html).toContain('contenteditable="false"');
  });

  it("orders blocks by position", () => {
    const html = blocksToCanvasHtml(
      [
        block({ id: "a", position: 5, html: "<p>second</p>" }),
        block({ id: "b", position: 1, html: "<p>first</p>" }),
      ],
      new Map(),
    );
    expect(html).toEqual("<p>first</p><p>second</p>");
  });

  it("skips empty legacy text blocks and unresolvable images", () => {
    const html = blocksToCanvasHtml(
      [
        block({ position: 0, words: [], html: null }),
        block({ position: 1, type: "image", image_url: null, words: null }),
      ],
      new Map(),
    );
    expect(html).toEqual("");
  });
});

describe("canvasPartsToBlocks", () => {
  it("merges consecutive text parts into one block", () => {
    const blocks = canvasPartsToBlocks([
      { kind: "html", html: "<p>a</p>" },
      { kind: "html", html: "<p>b</p>" },
    ]);
    expect(blocks).toEqual([{ type: "text", html: "<p>a</p><p>b</p>" }]);
  });

  it("splits runs at figures", () => {
    const blocks = canvasPartsToBlocks([
      { kind: "html", html: "<p>before</p>" },
      { kind: "figure", path: "doc-1/x.png" },
      { kind: "html", html: "<p>after</p>" },
    ]);
    expect(blocks).toEqual([
      { type: "text", html: "<p>before</p>" },
      { type: "image", image_path: "doc-1/x.png" },
      { type: "text", html: "<p>after</p>" },
    ]);
  });

  it("drops parts whose text is empty", () => {
    const blocks = canvasPartsToBlocks([
      { kind: "html", html: "<p><br></p>" },
      { kind: "html", html: "   " },
    ]);
    expect(blocks).toEqual([]);
  });

  it("keeps hr-only content", () => {
    const blocks = canvasPartsToBlocks([{ kind: "html", html: "<hr>" }]);
    expect(blocks).toEqual([{ type: "text", html: "<hr>" }]);
  });

  it("sanitizes hostile markup before persisting", () => {
    const blocks = canvasPartsToBlocks([
      { kind: "html", html: '<p onclick="x()">hi<script>bad()</script></p>' },
    ]);
    expect(blocks).toEqual([{ type: "text", html: "<p>hi</p>" }]);
  });

  it("skips figures with blank paths", () => {
    expect(canvasPartsToBlocks([{ kind: "figure", path: "  " }])).toEqual([]);
  });
});

describe("validateEditorPayload", () => {
  const DOC = "doc-123";

  it("rejects non-arrays and oversized payloads", async () => {
    const { validateEditorPayload, MAX_BLOCKS } = await import("@/lib/editor");
    expect(validateEditorPayload("nope", DOC).ok).toBe(false);
    expect(validateEditorPayload(undefined, DOC).ok).toBe(false);
    const huge = Array.from({ length: MAX_BLOCKS + 1 }, () => ({
      type: "text",
      html: "<p>x</p>",
    }));
    expect(validateEditorPayload(huge, DOC).ok).toBe(false);
  });

  it("sanitizes text and tokenizes words", async () => {
    const { validateEditorPayload } = await import("@/lib/editor");
    const result = validateEditorPayload(
      [
        {
          type: "text",
          html: '<p class="x" onclick="hack()">Hello <strong>world</strong><script>evil()</script></p>',
        },
      ],
      DOC,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.blocks).toEqual([
      {
        type: "text",
        html: "<p>Hello <strong>world</strong></p>",
        words: ["Hello", "world"],
      },
    ]);
  });

  it("drops blocks with no readable content", async () => {
    const { validateEditorPayload } = await import("@/lib/editor");
    const result = validateEditorPayload(
      [
        { type: "text", html: "<p><br></p>" },
        { type: "text", html: "<p>keep</p>" },
      ],
      DOC,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.blocks).toHaveLength(1);
  });

  it("accepts image paths under this document only", async () => {
    const { validateEditorPayload } = await import("@/lib/editor");
    const ok = validateEditorPayload(
      [{ type: "image", image_path: `${DOC}/editor_1-img.png` }],
      DOC,
    );
    expect(ok.ok).toBe(true);

    const escapes = [
      "other-doc/x.png",
      `${DOC}/../../secret.png`,
      `${DOC}/a b.png`, // unsafe chars
      "https://evil.dev/x.png",
      "/etc/passwd",
    ];
    for (const image_path of escapes) {
      const res = validateEditorPayload([{ type: "image", image_path }], DOC);
      expect(res.ok, `should reject ${image_path}`).toBe(false);
    }
  });

  it("rejects unknown types and malformed members", async () => {
    const { validateEditorPayload } = await import("@/lib/editor");
    expect(validateEditorPayload([{ type: "video" }], DOC).ok).toBe(false);
    expect(validateEditorPayload(["text"], DOC).ok).toBe(false);
    expect(validateEditorPayload([{ type: "text" }], DOC).ok).toBe(false);
    expect(
      validateEditorPayload([{ type: "image" }], DOC).ok,
    ).toBe(false);
    expect(
      validateEditorPayload([{ type: "text", html: 42 }], DOC).ok,
    ).toBe(false);
  });

  it("rejects blocks over the size cap", async () => {
    const { validateEditorPayload, MAX_HTML_CHARS } = await import("@/lib/editor");
    const res = validateEditorPayload(
      [{ type: "text", html: "<p>" + "a".repeat(MAX_HTML_CHARS) + "</p>" }],
      DOC,
    );
    expect(res.ok).toBe(false);
  });
});
