"""Detect and preserve mathematical expressions as single RSVP tokens."""

from __future__ import annotations

import re

_SYM = (
    "μαβγδθλρστωΦφ∅Ωω∞∫∑√≤≥≠±·×÷∂∇η"
    "₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹"
)

_EQ_LINE = re.compile(
    rf"^\s*[A-Za-z{_SYM}][A-Za-z0-9{_SYM}]{{0,16}}"
    rf"(?:\s*\([^)]{{0,28}}\))?"
    rf"\s*=\s*"
    rf"[A-Za-z0-9{_SYM}\(\)\[\]\./\^\+\-\*·×÷±\s,]{{1,90}}\s*$"
)

_INLINE_PATTERNS = [
    re.compile(
        rf"(?<![A-Za-z0-9])"
        rf"([A-Za-z{_SYM}][A-Za-z0-9{_SYM}]{{0,12}})"
        rf"\s*\(\s*=\s*"
        rf"([^)]{{1,40}})"
        rf"\s*\)"
    ),
    re.compile(
        rf"\("
        rf"([A-Za-z{_SYM}][A-Za-z0-9{_SYM}]{{0,12}})"
        rf"\s*=\s*"
        rf"([A-Za-z0-9{_SYM}\(\)\[\]\./\^\+\-\*·×÷±]+)"
        rf"\)"
    ),
    re.compile(
        rf"(?<![A-Za-z0-9])"
        rf"([A-Za-z{_SYM}][A-Za-z0-9{_SYM}]{{0,12}})"
        rf"\s*=\s*"
        rf"(-?"
        rf"[A-Za-z0-9{_SYM}\(\)\[\]\./\^\+\-\*·×÷±]+"
        rf"(?:\s+[A-Za-z0-9{_SYM}\(\)\[\]\./\^\+\-\*·×÷±]+){{0,5}}"
        rf")"
    ),
]


def is_math_token(token: str) -> bool:
    t = token.strip().rstrip(".,;")
    if len(t) < 3 or len(t) > 100:
        return False
    if "=" not in t:
        return False
    alpha_words = re.findall(r"\b[A-Za-z]{4,}\b", t)
    if len(alpha_words) >= 3:
        return False
    return True


def extract_math_segments(text: str) -> list[tuple[str, bool]]:
    if not text or not text.strip():
        return []

    parts: list[tuple[str, bool]] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if _EQ_LINE.match(line):
            parts.append((line, True))
            continue

        matches: list[tuple[int, int, str]] = []
        for pat in _INLINE_PATTERNS:
            for m in pat.finditer(line):
                matches.append((m.start(), m.end(), m.group(0).strip()))
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
    t = re.sub(r"\(\s*=\s*", "(= ", t)
    t = re.sub(r"\s*=\s*", " = ", t)
    t = re.sub(r"\s+", " ", t)
    return t
