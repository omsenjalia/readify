import { describe, expect, it } from "vitest";
import { getORPIndex, splitAtORP } from "@/lib/orp";

describe("getORPIndex", () => {
  it("keeps 1-5 grapheme words at index 1", () => {
    expect(getORPIndex("a")).toBe(0); // contentCount <= 1
    expect(getORPIndex("to")).toBe(1);
    expect(getORPIndex("reads")).toBe(1); // 5 content graphemes
  });

  it("walks outward for longer words", () => {
    // Bands: <=1 -> 0, <=5 -> 1, <=9 -> 2, <=13 -> 3, else 4.
    expect(getORPIndex("reader")).toBe(2); // 6
    expect(getORPIndex("readers")).toBe(2); // 7
    expect(getORPIndex("readable")).toBe(2); // 8
    expect(getORPIndex("recognition")).toBe(3); // 11
    expect(getORPIndex("international")).toBe(3); // 13
    expect(getORPIndex("internationalization")).toBe(4); // > 13
  });
});

describe("splitAtORP", () => {
  it("splits into before/orp/after", () => {
    // "readers" has 7 content graphemes -> band <=9 -> ORP index 2
    expect(splitAtORP("readers")).toEqual({
      before: "re",
      orp: "a",
      after: "ders",
    });
  });

  it("handles the empty string", () => {
    expect(splitAtORP("")).toEqual({ before: "", orp: "", after: "" });
  });

  it("is lossless: concatenation always rebuilds the word", () => {
    const words = [
      "readers",
      "a",
      "I",
      "café",
      "don't",
      "e-mail",
      "(parens)",
      "A1",
      "snake_case",
      "UPPER",
    ];
    for (const w of words) {
      const { before, orp, after } = splitAtORP(w);
      expect(before + orp + after).toBe(w);
    }
  });

  it("counts only letters and digits toward the ORP position", () => {
    // "(reading)" -> 7 content graphemes -> band <=9 -> index 2 -> "a"
    const { orp } = splitAtORP("(reading)");
    expect(orp).toBe("a");
  });

  it("handles Devanagari via grapheme clustering", () => {
    const word = "पढ़ना"; // pa DHA na, with a combining mark
    const { before, orp, after } = splitAtORP(word);
    expect(before + orp + after).toBe(word);
    expect(orp.length).toBeGreaterThan(0);
  });

  it("falls back gracefully for a punctuation-only token", () => {
    const { before, orp, after } = splitAtORP("***");
    expect(before + orp + after).toBe("***");
  });
});
