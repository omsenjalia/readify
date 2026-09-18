import { describe, expect, it } from "vitest";
import {
  looksLikeMarkdown,
  markdownToPlainText,
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
