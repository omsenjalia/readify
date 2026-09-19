import { describe, expect, it } from "vitest";
import {
  buildLineIndex,
  layoutLines,
  layoutLinesByChars,
} from "@/lib/lines";

describe("layoutLines", () => {
  it("returns [] for empty input", () => {
    expect(layoutLines([], 4, 100)).toEqual([]);
  });

  it("returns [] for a non-positive maxWidth", () => {
    expect(layoutLines([10, 20], 4, 0)).toEqual([]);
  });

  it("packs everything on one line when it fits", () => {
    // widths 10 + 4 + 20 + 4 + 30 = 68 <= 100
    expect(layoutLines([10, 20, 30], 4, 100)).toEqual([
      { start: 0, end: 3, width: 68 },
    ]);
  });

  it("wraps when the next word would overflow", () => {
    // line 1: 40 + 4 + 40 = 84 (<= 100); next 40 would make 128 → wrap
    expect(layoutLines([40, 40, 40], 4, 100)).toEqual([
      { start: 0, end: 2, width: 84 },
      { start: 2, end: 3, width: 40 },
    ]);
  });

  it("gives an over-wide word its own line", () => {
    expect(layoutLines([10, 500, 10], 4, 100)).toEqual([
      { start: 0, end: 1, width: 10 },
      { start: 1, end: 2, width: 500 },
      { start: 2, end: 3, width: 10 },
    ]);
  });

  it("accounts for the space width at the boundary", () => {
    // 50 + 10 + 50 = 110 > 100 with a wide space, but 102 > 100 too with 4.
    expect(layoutLines([50, 50, 50], 10, 100)).toEqual([
      { start: 0, end: 1, width: 50 },
      { start: 1, end: 2, width: 50 },
      { start: 2, end: 3, width: 50 },
    ]);
    // Same widths, tight space: two fit per line.
    expect(layoutLines([50, 50, 50], 0, 100)).toEqual([
      { start: 0, end: 2, width: 100 },
      { start: 2, end: 3, width: 50 },
    ]);
  });

  it("keeps line contents contiguous and complete", () => {
    const widths = Array.from({ length: 97 }, (_, i) => 8 + (i % 13));
    const lines = layoutLines(widths, 5, 240);
    expect(lines[0].start).toBe(0);
    expect(lines[lines.length - 1].end).toBe(widths.length);
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].start).toBe(lines[i - 1].end);
    }
    for (const line of lines) {
      expect(line.end).toBeGreaterThan(line.start);
      expect(line.width).toBeGreaterThan(0);
    }
  });
});

describe("buildLineIndex", () => {
  it("maps every index to its line", () => {
    const lines = layoutLines([40, 40, 40, 40], 4, 100);
    const map = buildLineIndex(lines, 4);
    expect(Array.from(map)).toEqual([0, 0, 1, 1]);
  });

  it("marks unmapped indices with -1", () => {
    const map = buildLineIndex([{ start: 1, end: 3 }], 5);
    expect(Array.from(map)).toEqual([-1, 0, 0, -1, -1]);
  });
});

describe("layoutLinesByChars", () => {
  it("packs by character budget", () => {
    // "the"(3) +1+ "quick"(5) = 9 <= 10; +1+ "brown"(5) = 15 > 10 → wrap
    const lines = layoutLinesByChars(["the", "quick", "brown", "fox"], 10);
    expect(lines).toEqual([
      { start: 0, end: 2, width: 9 },
      { start: 2, end: 4, width: 9 },
    ]);
  });

  it("enforces a minimum budget", () => {
    const lines = layoutLinesByChars(["a", "b"], 0);
    expect(lines.length).toBe(1);
  });
});
