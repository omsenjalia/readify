import { describe, expect, it } from "vitest";
import { chunkWords, tokenizeText } from "@/lib/tokenize";

describe("tokenizeText", () => {
  it("splits plain prose into words", () => {
    expect(tokenizeText("the quick brown fox")).toEqual([
      "the",
      "quick",
      "brown",
      "fox",
    ]);
  });

  it("drops blank lines and normalises NBSP", () => {
    expect(tokenizeText("alpha\n\n  \nbeta\u00a0gamma")).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("keeps a standalone equation as a single token", () => {
    const out = tokenizeText("F = qv × B");
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("F = qv × B");
  });

  it("does not merge a normal prose sentence containing '='", () => {
    const out = tokenizeText("The answer is x = 2 and that is final.");
    expect(out.length).toBeGreaterThan(3);
  });

  it("strips leading/trailing punctuation from words", () => {
    expect(tokenizeText('"hello," she said.')).toEqual([
      "hello",
      "she",
      "said",
    ]);
  });

  it("returns [] for empty and whitespace-only input", () => {
    expect(tokenizeText("")).toEqual([]);
    expect(tokenizeText("   \n\t ")).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    expect(tokenizeText("one\r\ntwo")).toEqual(["one", "two"]);
  });

  it("is lossless enough to count words for a long paragraph", () => {
    const sentence = "The quick brown fox jumps over the lazy dog. ";
    expect(tokenizeText(sentence.repeat(10))).toHaveLength(90);
  });
});

describe("chunkWords", () => {
  it("splits into fixed-size chunks", () => {
    const words = Array.from({ length: 200 }, (_, i) => `w${i}`);
    const chunks = chunkWords(words, 80);
    expect(chunks.map((c) => c.length)).toEqual([80, 80, 40]);
  });

  it("returns [] for no words", () => {
    expect(chunkWords([], 80)).toEqual([]);
  });

  it("preserves order and content", () => {
    const words = ["a", "b", "c", "d", "e"];
    expect(chunkWords(words, 2)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });
});
