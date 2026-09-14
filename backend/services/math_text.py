"""Detect and preserve mathematical expressions as single RSVP tokens.

Handles textbook edge cases from engineering PDFs:
- Display equations: E = -N(d∅/dt)
- Parenthetical: H (= NI/l), (V=IR)
- Abbreviations: m.m.f., e.m.f.
- Multi-term: Φ₁S₁ + Φ₂S₂ + Φ₃S₃
- Proportionality / implication: ∝, ⟹, →
- Comparison rows: Flux = … paired with Current = …
- Greek / subscripts: μ₀ μᵣ Φ₁
"""

from __future__ import annotations

import re
import unicodedata

_SYM = (
    "μαβγδθλρστωΦφ∅Ωω∞∫∑√≤≥≠±·×÷∂∇ηρ"
    "₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹"
    "∝⟹⇒→←↔⇔"
)

_REPLACEMENTS = (
    ("\uf0b7", "•"),
    ("\u00a0", " "),
)

# LHS may include dots: m.m.f., e.m.f., Pe, Bmax, Φ₁S₁
_LHS = r"(?:[A-Za-z" + _SYM + r"][A-Za-z0-9" + _SYM + r".]{0,16})"


def normalize_pdf_text(text: str) -> str:
    t = text
    for a, b in _REPLACEMENTS:
        t = t.replace(a, b)
    return unicodedata.normalize("NFKC", t)


_EQ_LINE = re.compile(
    r"^\s*"
    + _LHS
    + r"(?:\s*\([^)]{0,40}\))?"
    r"\s*[=∝⟹⇒→]\s*"
    r".{1,100}\s*$"
)

_COMPARISON_ROW = re.compile(
    r"^\s*("
    + _LHS
    + r"\s*=\s*.+?)"
    r"(?:\s{2,}|\t+|\|)\s*"
    r"("
    + _LHS
    + r"\s*=\s*.+?)\s*$"
)

_INLINE_PATTERNS = [
    # S = l / μA (= l / μ₀ μᵣ A)  — equation with clarifying (=)
    re.compile(
        r"(?<![A-Za-z0-9])"
        + _LHS
        + r"\s*=\s*"
        r"[^=]{1,40}?"
        r"\(\s*=\s*"
        r"[^)]{1,40}"
        r"\s*\)"
    ),
    # H (= NI/l)
    re.compile(
        r"(?<![A-Za-z0-9])"
        + _LHS
        + r"\s*\(\s*=\s*"
        r"([^)]{1,50})"
        r"\s*\)"
    ),
    # (V=IR)
    re.compile(
        r"\("
        + _LHS
        + r"\s*=\s*"
        r"([A-Za-z0-9" + _SYM + r"\(\)\[\]\./\^\+\-\*·×÷±]+)"
        r"\)"
    ),
    # Flux = m.m.f. / reluctance  |  Pe = Ke …
    re.compile(
        r"(?<![A-Za-z0-9])"
        + _LHS
        + r"\s*[=∝]\s*"
        r"(-?"
        r"[A-Za-z0-9" + _SYM + r"\(\)\[\]\./\^\+\-\*·×÷±]+"
        r"(?:\s*[+/·×÷]\s*[A-Za-z0-9" + _SYM + r"\(\)\[\]\./\^\+\-\*·×÷±]+)*"
        r"(?:\s+[A-Za-z0-9" + _SYM + r"\(\)\[\]\./\^\+\-\*·×÷±]+){0,6}"
        r")"
    ),
    # Multi-term sum without leading name: Φ₁S₁ + Φ₂S₂ + Φ₃S₃
    re.compile(
        r"(?<![A-Za-z0-9])"
        r"((?:[A-Za-z" + _SYM + r"][A-Za-z0-9" + _SYM + r"]{0,10}"
        r"\s*[+]\s*){1,8}"
        r"[A-Za-z" + _SYM + r"][A-Za-z0-9" + _SYM + r"]{0,10})"
    ),
]


def is_math_token(token: str) -> bool:
    t = token.strip().rstrip(".,;")
    if len(t) < 3 or len(t) > 140:
        return False
    if any(op in t for op in ("=", "∝", "⟹", "⇒", "→", "⇔")):
        alpha_words = re.findall(r"\b[A-Za-z]{4,}\b", t)
        if len(alpha_words) >= 5:
            return False
        return True
    if "+" in t and any(c in t for c in _SYM):
        return True
    return False


def extract_math_segments(text: str) -> list[tuple[str, bool]]:
    if not text or not text.strip():
        return []

    text = normalize_pdf_text(text)
    parts: list[tuple[str, bool]] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        m_cmp = _COMPARISON_ROW.match(line)
        if m_cmp:
            left = normalize_math_token(m_cmp.group(1))
            right = normalize_math_token(m_cmp.group(2))
            parts.append((f"{left}  ⇔  {right}", True))
            continue

        if _EQ_LINE.match(line):
            parts.append((line, True))
            continue

        matches: list[tuple[int, int, str]] = []
        for pat in _INLINE_PATTERNS:
            for m in pat.finditer(line):
                frag = m.group(0).strip()
                if len(re.findall(r"\b[A-Za-z]{4,}\b", frag)) >= 5:
                    continue
                matches.append((m.start(), m.end(), frag))
        matches.sort(key=lambda x: (x[0], -(x[1] - x[0])))
        picked: list[tuple[int, int, str]] = []
        cursor = 0
        for start, end, frag in matches:
            if start < cursor:
                continue
            picked.append((start, end, frag))
            cursor = end

        if not picked:
            parts.append((line, False))
            continue

        last = 0
        for start, end, frag in picked:
            if start > last:
                parts.append((line[last:start], False))
            parts.append((frag, True))
            last = end
        if last < len(line):
            parts.append((line[last:], False))

    return parts


def normalize_math_token(expr: str) -> str:
    t = expr.strip().rstrip(".,;")
    t = normalize_pdf_text(t)
    t = re.sub(r"\(\s*=\s*", "(= ", t)
    t = re.sub(r"\s*([=∝⟹⇒→⇔])\s*", r" \1 ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()
