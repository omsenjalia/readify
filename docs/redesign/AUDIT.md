# Read/IO theme iteration — delivery audit

**Date:** 2026-09-23 · **Branch:** `arena/01a0cc25-readio`

## What changed in this iteration

Per user request, the Paper redesign was **reverted** and the **original
UI/UX was restored exactly** (hero "Read {rotating word} at the speed of
thought", feature tabs, original sections, original reader chrome), with
three colour changes:

1. **White background** — the original `.light` token set is now the
   `:root` baseline (near-white `#f4f8f4` ground, white cards).
2. **Black text** — near-black ink `#101a13`.
3. **Red ORP** — the pivot letter is now red `#dc2626` (`--color-orp`),
   separate from the green accent.

Plus two decisions taken with the user:

- **Accent:** the old emerald green is kept for CTAs, links, pills,
  highlights and the progress bar; **red is used only for the ORP pivot
  letter**.
- **White-only:** dark and sepia themes were removed entirely — no theme
  picker in the reader or settings, no theme class plumbing.

## Colour (verified — every pair clears WCAG AA)

| Pair | Ratio |
|---|---|
| ink `#101a13` on bg / surface | 16.60 / 17.42 : 1 |
| muted `#55665a` on bg / surface | 5.70 / 6.11 : 1 |
| subtle `#5f7265` on bg / surface / soft | 4.80 / 5.15 / 4.53 : 1 |
| accent text `#047857` on bg / surface | 5.11 / 5.48 : 1 |
| white on CTA green `#047857` (hover `#065f46`) | 5.48 / 7.68 : 1 |
| **ORP red `#dc2626` on bg / surface** | **4.50 / 4.83 : 1** (passes AA even as text) |
| danger red on surface | 4.83 : 1 |

Two inherited defects of the original light palette were minimally corrected
to meet the AA gate: subtle text darkened `#83968a → #5f7265` and the CTA
green deepened `#059669 → #047857` (both near-indistinguishable, both now
≥ 4.5:1).

## What was touched

- `globals.css` — single white token set (old `.light` values),
  `--color-orp: #dc2626`, dark/sepia blocks and the `light:` Tailwind
  variant removed, dead keyframes removed.
- Theme plumbing removed: pre-paint theme script in `(app)/layout`,
  `applyThemeClass` + theme state in `useReaderSettings`, theme pickers in
  the reader `SettingsPanel` and the settings page, `THEMES = ["light"]`
  (the preferences API only accepts "light"; the DB column is kept for
  data compatibility, default flipped to `light` by migration
  `20260923120000`).
- ORP copy updated to match ("That red pivot never moves").
- Branding pass (standing rule): `Read/IO` in titles/lockup, `Readio` in
  body/meta/labels; 0 occurrences of the legacy `ReadIO` spelling remain.
- `icon.svg` — white tile, ink lines, red pivot dot.

## QA results

| Gate | Result |
|---|---|
| `next build` (production) | ✅ compiles, TS clean, 15/15 routes |
| Unit tests | ✅ **123/123** (incl. updated schema test: only `light` accepted) |
| ESLint `--max-warnings 0` | ✅ 0 |
| Console/hydration errors (headless, all pages × widths) | ✅ none |
| CLS (buffered layout-shift, per page × width) | ✅ ≤ 0.0009 |
| Contrast | ✅ all pairs AA (table above) |
| Dead CSS | ✅ none |
| Branding grep | ✅ 0 `ReadIO`, 0 legacy dark-theme hexes |

## Screenshots

- `before-home-1440-full.png` / `before-login-1440.png` — the reverted-to
  Paper state (previous PR revision)
- `after-home-1440-full.png` / `after-home-375.png` — restored original
  UI/UX on white
- `after-demo-1440.png` — the original reader with the **red ORP pivot**
- `after-login-1440.png` — original auth on white
