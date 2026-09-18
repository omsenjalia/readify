import { describe, expect, it } from "vitest";
import {
  SPECIAL_DWELL_MS,
  formatMathDisplay,
  isComparisonToken,
  isDefinitionToken,
  isMathToken,
  mathDwellMs,
  splitComparison,
} from "@/lib/math";

describe("isMathToken", () => {
  it("accepts equations", () => {
    expect(isMathToken("E = mc²")).toBe(true);
    expect(isMathToken("F = qv × B")).toBe(true);
  });

  it("rejects prose that merely contains '='", () => {
    expect(
      isMathToken("which means the total energy equals some other quantity now"),
    ).toBe(false);
  });

  it("accepts compact equations from the lower length bound", () => {
    expect(isMathToken("a=1")).toBe(true); // exactly 3 chars
  });

  it("rejects tokens shorter than 3 or longer than 140 chars", () => {
    expect(isMathToken("x=")).toBe(false); // 2 chars
    expect(isMathToken(`x = ${"y".repeat(200)}`)).toBe(false); // > 140 chars
  });

  it("rejects bullet-led lines", () => {
    expect(isMathToken("• E = mc²")).toBe(false);
  });

  it("needs a math glyph as well as '+' to treat a sum as math", () => {
    expect(isMathToken("a + b")).toBe(false); // ASCII letters only
    expect(isMathToken("μ + Φ")).toBe(true); // contains math glyphs
  });

  it("rejects '+'-only prose", () => {
    expect(isMathToken("apples + oranges")).toBe(false);
  });
});

describe("isDefinitionToken", () => {
  it("accepts Term = long English gloss", () => {
    expect(isDefinitionToken("Flux = the total field passing through")).toBe(
      true,
    );
  });

  it("rejects when the left side is too long", () => {
    expect(
      isDefinitionToken("A very long left hand side = some gloss here"),
    ).toBe(false);
  });

  it("rejects when the gloss is too short", () => {
    expect(isDefinitionToken("Flux = short")).toBe(false);
  });

  it("rejects tokens without '='", () => {
    expect(isDefinitionToken("Flux is the total")).toBe(false);
  });
});

describe("isComparisonToken / splitComparison", () => {
  it("detects magnetic/electric comparison rows", () => {
    const t = "B = μH  ⇔  D = εE";
    expect(isComparisonToken(t)).toBe(true);
    expect(splitComparison(t)).toEqual({ left: "B = μH", right: "D = εE" });
  });

  it("returns null when there is not exactly one ⇔", () => {
    expect(splitComparison("a ⇔ b ⇔ c")).toBeNull();
    expect(splitComparison("no arrow here")).toBeNull();
  });
});

describe("formatMathDisplay", () => {
  it("normalises spacing around operators", () => {
    expect(formatMathDisplay("E=mc²")).toBe("E = mc²");
    expect(formatMathDisplay("x  ∝  y")).toBe("x ∝ y");
  });

  it("wraps every operator in single spaces and collapses runs", () => {
    // The generous "  ⇔  " spacing written by the arrow rule is collapsed by
    // the final whitespace normalisation, so output spacing is uniform.
    expect(formatMathDisplay("a=b⇔c=d")).toBe("a = b ⇔ c = d");
    expect(formatMathDisplay("a  ⇔  b")).toBe("a ⇔ b");
  });
});

describe("mathDwellMs", () => {
  it("is the shared special dwell, independent of speed", () => {
    expect(mathDwellMs()).toBe(SPECIAL_DWELL_MS);
    expect(SPECIAL_DWELL_MS).toBe(15_000);
  });
});
