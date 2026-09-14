/**
 * Math-aware RSVP helpers for textbook equations & comparisons.
 */

const MATH_OPS = /[=∝⟹⇒→⇔]/;
const MATH_HINT =
  /[μΦφ∅Ωαβγδθλρσω∫∑√≤≥≠±·×÷∂∇₀-₉⁰-⁹ηρ]/;

/** True when an RSVP token should be treated as a single equation unit. */
export function isMathToken(token: string): boolean {
  const t = token.trim();
  if (t.length < 3 || t.length > 140) return false;
  if (MATH_OPS.test(t)) {
    const alphaWords = t.match(/\b[A-Za-z]{4,}\b/g) || [];
    if (alphaWords.length >= 5) return false;
    return true;
  }
  if (t.includes("+") && MATH_HINT.test(t)) return true;
  return false;
}

/** Best-effort display cleanup (keep readable; full LaTeX optional later). */
export function formatMathDisplay(expr: string): string {
  return expr
    .replace(/\s*=\s*/g, " = ")
    .replace(/\s*∝\s*/g, " ∝ ")
    .replace(/\s*⇔\s*/g, "  ⇔  ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toLatex(expr: string): string {
  let s = formatMathDisplay(expr);
  s = s.replace(/μ/g, "\\mu ").replace(/Φ|φ|∅/g, "\\phi ").replace(/Ω/g, "\\Omega ");
  s = s.replace(/·/g, "\\cdot ").replace(/×/g, "\\times ");
  s = s.replace(/∝/g, "\\propto ").replace(/⇔/g, "\\Leftrightarrow ");
  return s;
}
