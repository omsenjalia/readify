/**
 * Math-aware RSVP helpers for textbook equations, comparisons, definitions.
 */

/** Shared dwell for images and equations (user can Space to skip). */
export const SPECIAL_DWELL_MS = 15_000;

const MATH_OPS = /[=∝⟹⇒→⇔]/;
const MATH_HINT =
  /[μΦφ∅Ωαβγδθλρσω∫∑√≤≥≠±·×÷∂∇₀-₉⁰-⁹ηρ]/;

const UNIT_RE =
  /^(?:Wb(?:\/m²|\/m2)?|AT(?:\/m)?|Watts?|V|A|Hz|H|T|N|m|mm|cm|kg|Wb\/m\^?2|A\/m²|A\/m2)$/i;

export function isMathToken(token: string): boolean {
  const t = token.trim();
  if (t.length < 3 || t.length > 140) return false;
  if (t.startsWith("•")) return false;
  if (MATH_OPS.test(t)) {
    const alphaWords = t.match(/\b[A-Za-z]{4,}\b/g) || [];
    if (alphaWords.length >= 6) return false;
    return true;
  }
  if (t.includes("+") && MATH_HINT.test(t)) return true;
  return false;
}

/** Term = English gloss (definition list). */
export function isDefinitionToken(token: string): boolean {
  const t = token.trim();
  const eq = t.indexOf("=");
  if (eq < 0) return false;
  const left = t.slice(0, eq).trim();
  const right = t.slice(eq + 1).trim();
  if (left.length > 24 || right.length < 10) return false;
  const alpha = right.match(/\b[A-Za-z]{3,}\b/g) || [];
  return alpha.length >= 2 && !MATH_HINT.test(right);
}

export function isComparisonToken(token: string): boolean {
  return token.includes("⇔") && token.includes("=");
}

/** Split comparison into left / right sides for stacked display. */
export function splitComparison(
  token: string,
): { left: string; right: string } | null {
  const parts = token.split(/\s*⇔\s*/);
  if (parts.length !== 2) return null;
  return { left: parts[0].trim(), right: parts[1].trim() };
}

export function formatMathDisplay(expr: string): string {
  return expr
    .replace(/\s*=\s*/g, " = ")
    .replace(/\s*∝\s*/g, " ∝ ")
    .replace(/\s*⇔\s*/g, "  ⇔  ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fixed 15s dwell for formulas (Space skips). */
export function mathDwellMs(_token?: string, _wpm?: number): number {
  return SPECIAL_DWELL_MS;
}

export function isUnitToken(token: string): boolean {
  return UNIT_RE.test(token.trim());
}

export function toLatex(expr: string): string {
  let s = formatMathDisplay(expr);
  s = s
    .replace(/μ/g, "\\mu ")
    .replace(/Φ|φ|∅/g, "\\phi ")
    .replace(/Ω/g, "\\Omega ");
  s = s.replace(/·/g, "\\cdot ").replace(/×/g, "\\times ");
  s = s.replace(/∝/g, "\\propto ").replace(/⇔/g, "\\Leftrightarrow ");
  return s;
}
