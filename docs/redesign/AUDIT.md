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

## Reader polish (follow-up on the same branch)

User-requested reader fixes, all shipped on this branch:

1. **Zero eye travel in Line Flow** — root cause: the strip aligned the
   *word centre* to the axis, so the red ORP character (the designated
   fixation point) sat off-axis by a per-word ORP offset. Fix
   (`reader/LineStage.tsx`): the alignment pivot is now the ORP character
   element itself, so the red letter lands on the exact same pixel for
   every word; formula tokens (no ORP split) fall back to the word
   centre. Measured headless across 13 consecutive words: ORP letter
   centre within **0.48px** of the axis on every word (subpixel,
   `offsetLeft` integer rounding) — previously the letter moved a full
   ORP offset (2–15px) between words.
2. **Reset control** — new "Back to the beginning" button
   (`RotateCcw`, `reader/ReaderControls.tsx`), wired to the engine's
   `seek(0)` in `Reader.tsx` with a toast; verified to return to word 1.
3. **One word = default mode** — `DEFAULT_READING_MODE` flipped
   `"line" → "word"` (`lib/constants.ts`); the segmented control was
   reordered with One word primary and Line Flow secondary. Devices with
   a saved mode keep it (localStorage), so the flip only affects fresh
   visitors.
4. **Transport row centred on mobile and desktop** — mobile: the
   mobile-only settings button sat left of the play button (3 left / 1
   right), leaving play 50px right of screen centre at 375px; it is now
   `order-last` on small screens (`[reset][back] · play ·
   [next][settings]`). Desktop had the same defect mildly: 2 left / 3
   right (5 side buttons can't balance in a centred row), leaving play
   −28px. Fixed by adding the already-supported fullscreen toggle
   (visible on md+, hidden on mobile) as the 6th side button, making it
   3 vs 3: `[fullscreen][reset][back] · play · [next][font][settings]`.
   Measured: play at the viewport centre on both 375px and 1440px
   (0.0px off-centre; was +50px / −28px). Fullscreen toggle verified
   functionally (enters fullscreen, "Esc to exit" appears, no errors).
5. **Hero "New — Line Flow reading" badge removed** from the landing
   page (user request) — the hero now opens directly on the headline;
   `pill-accent` stays in use by the hero demo card and settings form,
   so no dead CSS.

All gates re-run after these changes: production build 15/15, 123/123
tests, eslint 0, CLS 0.0000 on every page × width, no console/hydration
errors.

## Screenshots

- `before-home-1440-full.png` / `before-login-1440.png` — the reverted-to
  Paper state (previous PR revision)
- `after-home-1440-full.png` / `after-home-375.png` /
  `after-home-768.png` / `after-home-1280.png` — restored original
  UI/UX on white
- `after-demo-1440.png` — reader default: **One word** mode, red ORP
  pivot, reset control in the transport row
- `after-demo-lineflow-1440.png` — Line Flow with the red ORP character
  pinned to the centre axis (zero eye travel)
- `after-login-1440.png` / `after-login-375.png` — original auth on white
