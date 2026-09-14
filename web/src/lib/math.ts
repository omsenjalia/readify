/**
 * Math-aware RSVP helpers.
 * Equations stay as one token and can render via KaTeX when possible.
 */

const MATH_HINT =
  /[μΦφ∅Ωαβγδθλρσω∫∑√≤≥≠±·×÷∂∇₀-₉⁰-⁹]/;

/** True when an RSVP token should be treated as a single equation unit. */
export function isMathToken(token: string): boolean {
  const t = token.trim();
  if (t.length < 3 || t.length > 120) return false;
  if (!t.includes("=")) return false;
  if (MATH_HINT.test(t)) return true;
  // Engineering identities: V=IR, H = NI/l, Pe=Ke...
  if (/^[A-Za-z][A-Za-z0-9₀-₉]{0,12}\s*=\s*.{1,80}$/.test(t)) return true;
  if (/\([^)]{0,40}\)\s*=/.test(t)) return true;
  return false;
}

/**
 * Best-effort conversion of textbook math to KaTeX-ish LaTeX.
 * Falls back to the original string when conversion is unreliable.
 */
export function toLatex(expr: string): string {
  let s = expr.trim();
  // unicode mu / phi
  s = s.replace(/μ/g, "\\mu ").replace(/Φ|φ|∅/g, "\\phi ").replace(/Ω/g, "\\Omega ");
  s = s.replace(/·/g, "\\cdot ").replace(/×/g, "\\times ");
  s = s.replace(/≤/g, "\\leq ").replace(/≥/g, "\\geq ").replace(/≠/g, "\\neq ");
  s = s.replace(/±/g, "\\pm ");
  // subscripts ₀-₉
  const sub: Record<string, string> = {
    "₀": "0",
    "₁": "1",
    "₂": "2",
    "₃": "3",
    "₄": "4",
    "₅": "5",
    "₆": "6",
    "₇": "7",
    "₈": "8",
    "₉": "9",
  };
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => `_${sub[c]}`);
  // simple d∅/dt → \frac{d\phi}{dt}
  s = s.replace(
    /d\\phi\s*\/\s*dt/gi,
    "\\frac{d\\phi}{dt}",
  );
  s = s.replace(/d∅\/dt/g, "\\frac{d\\phi}{dt}");
  s = s.replace(/\s*=\s*/g, " = ");
  return s;
}
