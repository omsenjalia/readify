import { describe, expect, it } from "vitest";
import {
  looksLikeMarkdown,
  markdownToHtml,
  markdownToPlainText,
  plainTextToHtml,
  prepareReadableText,
} from "@/lib/markdown";

describe("looksLikeMarkdown", () => {
  it("is false for plain prose", () => {
    expect(
      looksLikeMarkdown(
        "The quick brown fox jumps over the lazy dog. It was a dark and stormy night.",
      ),
    ).toBe(false);
  });

  it("is true for a heading, regardless of other signals", () => {
    expect(looksLikeMarkdown("# Title\n\nSome text.")).toBe(true);
  });

  it("is true for a fenced code block", () => {
    expect(looksLikeMarkdown("intro\n```js\nconst a = 1;\n```")).toBe(true);
  });

  it("requires 2+ distinct signals for weaker markers", () => {
    // The detector counts distinct *patterns*, not occurrences: a bullet list
    // is a single signal no matter how many bullets it has.
    expect(looksLikeMarkdown("Just a list:\n\n- one")).toBe(false); // 1 signal
    expect(looksLikeMarkdown("- one\n- two\n- three")).toBe(false); // still 1 signal
    expect(looksLikeMarkdown("**bold** and [a](b)")).toBe(true); // 2 signals
  });

  it("strips nothing on its own", () => {
    expect(looksLikeMarkdown("**bold**")).toBe(false); // 1 signal only
  });
});

describe("markdownToPlainText", () => {
  it("removes headings", () => {
    expect(markdownToPlainText("## Section\nbody")).toBe("Section\nbody");
  });

  it("unwraps emphasis and inline code", () => {
    expect(markdownToPlainText("a **bold** b _it_ c `code` d")).toBe(
      "a bold b it c code d",
    );
  });

  it("keeps link text and drops the URL", () => {
    expect(markdownToPlainText("see [the docs](https://x.test/a) now")).toBe(
      "see the docs now",
    );
  });

  it("keeps image alt text", () => {
    expect(markdownToPlainText("![a cat](cat.png)")).toBe("a cat");
  });

  it("unwraps code fences", () => {
    expect(markdownToPlainText("```py\nx = 1\n```")).toBe("x = 1");
  });

  it("strips blockquote markers", () => {
    expect(markdownToPlainText("> quoted")).toBe("quoted");
  });

  it("strips list markers", () => {
    expect(markdownToPlainText("- a\n- b\n1. c")).toBe("a\nb\nc");
  });

  it("strips task-list checkboxes", () => {
    expect(markdownToPlainText("- [x] done")).toBe("done");
  });

  it("flattens table rows into comma lists and drops the separator row", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const out = markdownToPlainText(md);
    expect(out).toContain("a, b");
    expect(out).toContain("1, 2");
    // Regression: the separator row used to leak through as "---, ---".
    expect(out).not.toContain("---");
  });

  it("drops a separator row without leading/trailing pipes", () => {
    expect(markdownToPlainText("a | b\n--- | ---\n1 | 2")).not.toContain("---");
  });

  it("strips raw HTML tags", () => {
    expect(markdownToPlainText("<div>hi</div>")).toBe("hi");
  });

  it("removes footnote references and link definitions", () => {
    expect(markdownToPlainText("text[^1]\n\n[^1]: note")).not.toContain("[^1]");
    expect(markdownToPlainText("[ref]: https://x.test\n\nbody")).toBe("body");
  });

  it("collapses runs of blank lines", () => {
    expect(markdownToPlainText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("is lossless for content without markdown", () => {
    expect(markdownToPlainText("plain sentence.")).toBe("plain sentence.");
  });
});

describe("prepareReadableText", () => {
  it("strips a BOM", () => {
    expect(prepareReadableText("\uFEFFhello")).toBe("hello");
  });

  it("forces markdown stripping when asked", () => {
    expect(prepareReadableText("**x**", true)).toBe("x");
  });

  it("auto-detects markdown", () => {
    expect(prepareReadableText("# H\n\ntext")).toBe("H\n\ntext");
  });

  it("leaves plain text untouched", () => {
    const plain = "no markup here at all";
    expect(prepareReadableText(plain)).toBe(plain);
  });
});

describe("markdownToHtml", () => {
  it("renders headings and paragraphs", () => {
    expect(markdownToHtml("# Title\n\nBody text")).toBe(
      "<h1>Title</h1>\n<p>Body text</p>",
    );
    expect(markdownToHtml("### Third")).toBe("<h3>Third</h3>");
  });

  it("renders emphasis, strike and code", () => {
    expect(markdownToHtml("a **b** c *d* e ~~f~~ g `h`")).toBe(
      "<p>a <strong>b</strong> c <em>d</em> e <del>f</del> g <code>h</code></p>",
    );
  });

  it("keeps bold markers inside code spans untouched", () => {
    expect(markdownToHtml("`**not bold**`")).toBe("<p><code>**not bold**</code></p>");
  });

  it("renders links only for safe URLs", () => {
    expect(markdownToHtml("[docs](https://x.dev/a)")).toBe(
      '<p><a href="https://x.dev/a">docs</a></p>',
    );
    expect(markdownToHtml("[x](javascript:alert(1))")).toBe("<p>x</p>");
    expect(markdownToHtml("[x](/library)")).toBe('<p><a href="/library">x</a></p>');
    expect(markdownToHtml("[x](//evil.dev)")).toBe("<p>x</p>");
  });

  it("degrades images to alt text like the reader", () => {
    expect(markdownToHtml("![a cat](cat.png)")).toBe("<p>a cat</p>");
  });

  it("renders both list flavours", () => {
    expect(markdownToHtml("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
    expect(markdownToHtml("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>");
    expect(markdownToHtml("- [x] done")).toBe("<ul><li>done</li></ul>");
  });

  it("joins lazy continuations into the list item", () => {
    expect(markdownToHtml("- item\n  continued")).toBe(
      "<ul><li>item continued</li></ul>",
    );
  });

  it("renders blockquotes recursively", () => {
    expect(markdownToHtml("> quoted **x**")).toBe(
      "<blockquote><p>quoted <strong>x</strong></p></blockquote>",
    );
  });

  it("renders fenced code verbatim and escaped", () => {
    expect(markdownToHtml("```js\nif (a < b) x;\n```")).toBe(
      "<pre><code>if (a &lt; b) x;</code></pre>",
    );
  });

  it("renders horizontal rules", () => {
    expect(markdownToHtml("a\n\n---\n\nb")).toBe("<p>a</p>\n<hr>\n<p>b</p>");
  });

  it("keeps soft line breaks inside a paragraph", () => {
    expect(markdownToHtml("one\ntwo")).toBe("<p>one<br>\ntwo</p>");
  });

  it("escapes raw HTML in the source", () => {
    expect(markdownToHtml("<script>evil()</script>")).toBe(
      "<p>&lt;script&gt;evil()&lt;/script&gt;</p>",
    );
  });

  it("flattens tables the same way the reader does", () => {
    const out = markdownToHtml("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(out).toBe("<p>a, b</p>\n<p>1, 2</p>");
  });

  it("drops link definitions", () => {
    expect(markdownToHtml("[ref]: https://x.test\n\nbody")).toBe("<p>body</p>");
  });
});

describe("plainTextToHtml", () => {
  it("wraps paragraphs and escapes markup", () => {
    expect(plainTextToHtml("a <b>\n\nsecond")).toBe(
      "<p>a &lt;b&gt;</p>\n<p>second</p>",
    );
  });

  it("turns single newlines into breaks", () => {
    expect(plainTextToHtml("one\ntwo")).toBe("<p>one<br>\ntwo</p>");
  });

  it("ignores blank runs", () => {
    expect(plainTextToHtml("  a  \n\n\n\n b ")).toBe("<p>a</p>\n<p>b</p>");
  });

  it("returns empty string for empty input", () => {
    expect(plainTextToHtml("   \n  ")).toBe("");
  });
});
