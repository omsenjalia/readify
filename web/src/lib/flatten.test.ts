import { describe, expect, it } from "vitest";
import { flattenBlocks } from "@/lib/flatten";
import type { ContentBlock } from "@/types";

function block(partial: Partial<ContentBlock>): ContentBlock {
  return {
    id: "b",
    document_id: "d",
    position: 0,
    type: "text",
    words: null,
    image_url: null,
    needs_ocr: false,
    ...partial,
  } as ContentBlock;
}

describe("flattenBlocks", () => {
  it("expands word blocks in order", () => {
    const items = flattenBlocks([
      block({ type: "text", words: ["a", "b"] }),
      block({ type: "text", words: ["c"] }),
    ]);
    expect(items).toEqual([
      { kind: "word", text: "a" },
      { kind: "word", text: "b" },
      { kind: "word", text: "c" },
    ]);
  });

  it("emits image items in place", () => {
    const items = flattenBlocks([
      block({ type: "text", words: ["a"] }),
      block({ type: "image", image_url: "d/1.png" }),
      block({ type: "text", words: ["b"] }),
    ]);
    expect(items.map((i) => i.kind)).toEqual(["word", "image", "word"]);
    expect(items[1]).toEqual({ kind: "image", url: "d/1.png" });
  });

  it("skips text blocks with no words", () => {
    expect(flattenBlocks([block({ type: "text", words: [] })])).toEqual([]);
    expect(flattenBlocks([block({ type: "text", words: null })])).toEqual([]);
  });

  it("skips image blocks with no url", () => {
    expect(flattenBlocks([block({ type: "image", image_url: null })])).toEqual(
      [],
    );
  });

  it("returns [] for no blocks", () => {
    expect(flattenBlocks([])).toEqual([]);
  });
});
