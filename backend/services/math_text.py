"""Detect and preserve mathematical expressions as single RSVP tokens."""

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
    ("\u2022", "•"),
)

_LHS = r"(?:[A-Za-z" + _SYM + r"][A-Za-z0-9" + _SYM + r".]{0,16})"

# Units often left as orphan tokens after formulas
_UNIT = re.compile(
    r"^(?:"
    r"Wb(?:/m²|/m2)?|AT(?:/m)?|Watts?|V|A|Hz|H|T|N|m|mm|cm|kg|"
    r"Wb/m\^?2|A/m²|A/m2|AT/m"
    r")$",
    re.I,
)

_DEF_LINE = re.compile(
    r"^\s*"
    + _LHS
    + r"\s*=\s*"
    r"[A-Za-z][A-Za-z\s,\-]{8,80}$"
)


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
    re.compile(
        r"(?<![A-Za-z0-9])"
        + _LHS
        + r"\s*=\s*"
        r"[^=]{1,40}?"
        r"\(\s*=\s*"
        r"[^)]{1,40}"
        r"\s*\)"
    ),
    re.compile(
        r"(?<![A-Za-z0-9])"
        + _LHS
        + r"\s*\(\s*=\s*"
        r"([^)]{1,50})"
        r"\s*\)"
    ),
    re.compile(
        r"\("
        + _LHS
        + r"\s*=\s*"
        r"([A-Za-z0-9" + _SYM + r"\(\)\[\]\./\^\+\-\*·×÷±]+)"
        r"\)"
    ),
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
    if t.startswith("•"):
        return False
    if any(op in t for op in ("=", "∝", "⟹", "⇒", "→", "⇔")):
        alpha_words = re.findall(r"\b[A-Za-z]{4,}\b", t)
        if len(alpha_words) >= 6:
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

        # Bullets → keep marker with first few words as one soft unit
        if line.startswith("•"):
            body = line.lstrip("•").strip()
            if body:
                parts.append((f"• {body}", False))
            continue

        m_cmp = _COMPARISON_ROW.match(line)
        if m_cmp:
            left = normalize_math_token(m_cmp.group(1))
            right = normalize_math_token(m_cmp.group(2))
            parts.append((f"{left}  ⇔  {right}", True))
            continue

        if _DEF_LINE.match(line):
            parts.append((normalize_math_token(line), True))
            continue

        if _EQ_LINE.match(line):
            parts.append((line, True))
            continue

        matches: list[tuple[int, int, str]] = []
        for pat in _INLINE_PATTERNS:
            for m in pat.finditer(line):
                frag = m.group(0).strip()
                if len(re.findall(r"\b[A-Za-z]{4,}\b", frag)) >= 6:
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


def glue_units(tokens: list[str]) -> list[str]:
    """Attach orphan units (Wb/m², AT/m, Watts…) to the preceding math token."""
    if not tokens:
        return tokens
    out: list[str] = []
    for tok in tokens:
        if out and _UNIT.match(tok.strip()) and is_math_token(out[-1]):
            out[-1] = f"{out[-1]} {tok.strip()}"
        else:
            out.append(tok)
    return out
