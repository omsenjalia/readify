# Read/IO redesign — delivery audit (Stage 5)

**Date:** 2026-09-23 · **Branch:** `arena/01a0cc25-readio` · **Baseline commit:** `3265afb`

## Brief

Full UI/UX rebuild of the Readio product: discard the retired emerald-on-green-black
palette; new premium editorial design system (variable display + body pairing);
scroll-driven motion that never blocks interactivity (>300ms) or hides content;
WCAG AA everywhere; mobile-first at 375/768/1280/1440; no placeholder copy; no dead
CSS/JS. Scope: marketing + auth rebuilt from scratch, all signed-in screens restyled,
3 reading themes, reader engine/business logic untouched.

Structural/visual baseline: fixmyland.ing (eyebrow → huge editorial h1 with italic
accent → highlighted lede → CTA + micro-trust → product proof → ticker → repeated
feature modules → steps → FAQ → closing CTA → footer finale), adapted to the Read/IO
product. Palette per user override: **modern white-and-black, white as the background**
(the proposed dark "Rubric" theme was rejected by the user).

## Before → after

| | Before | After |
|---|---|---|
| Palette | emerald `#34d399` on green-black `#060a08` | **Paper**: warm white `#faf9f6`, ink `#111113`, one ultramarine accent `#2b3bff` |
| Display face | Inter (static weights) | Fraunces variable (opsz/wght/SOFT/WONK), italic accent words |
| Body face | Newsreader (serif, dark-first) | Mona Sans variable (sans, built for 800 WPM readability) |
| Default theme | Dark | **Paper (light)** — Ink and Sepia opt-in (`.theme-ink` / `.theme-sepia`) |
| Hero | "Read {rotating word} at the speed of thought" | "The page moves. *Your eyes don't.*" + **live Line Flow demo card** (real reader stage, real engine) |
| Feature tour | tabbed feature cards | four editorial chapters, each with a self-animating/interactive visual (walking line, ORP pivot, drop tray, WPM dial) |
| Footer | standard link footer | giant Fraunces wordmark with variable-weight sweep |

Screenshots (all headless Chromium, real builds):

- `before-home-1440.png` / `before-home-375.png`
- `after-home-1440-full.png` / `after-home-375.png`
- `after-demo-paper-1440.png` · `after-demo-ink-1440.png` · `after-demo-sepia-1440.png`
- `after-login-1440.png`

## Design system

### Colour (verified — worst-case text contrast per surface, per theme)

| Token | Paper (default) | Ink | Sepia |
|---|---|---|---|
| bg | `#faf9f6` | `#0e0f11` | `#f1e8d7` |
| text | `#111113` (16.55:1) | `#efeff1` (13.47:1) | `#2a2214` (11.88:1) |
| muted | `#55555e` (6.47:1) | `#a9abb6` (6.77:1) | `#5e5238` (5.80:1) |
| subtle | `#6a6a74` (4.69:1) | `#8a8d99` (4.68:1) | `#6a5c42` (4.93:1) |
| accent / on-accent | `#2b3bff` (5.81:1) / `#ffffff` (6.62:1) | `#8e97ff` (5.91:1) / `#0e0f11` (7.32:1) | `#2b3bff` (5.01:1) / `#ffffff` (6.62:1) |
| ORP pivot vs word | 2.85:1 (AA-large/graphics, was 1.7:1 on emerald) | 2.28:1 | 2.37:1 |

Every text pair clears **WCAG AA** on every surface of every theme (script:
`/tmp/research/palette/paper.py` at QA time; pure-python, reproducible).

### Type

- **Fraunces** (variable: opsz 9–144, wght 100–900, SOFT, WONK) — display; the `wght`
  axis drives the footer wordmark sweep.
- **Mona Sans** (variable: wght 200–900, wdth 75–125) — body, UI, reader text (large
  x-height at speed).
- **Geist Mono** (variable) — labels, metrics, keyboard hints.
- **Noto Sans Devanagari / Gujarati** (variable) — plain `@font-face`, **not
  preloaded**: fetched only when a page renders those scripts.
- All self-hosted via `next/font/local` (no Google Fonts network dependency).
  Preloaded payload ≈ 390 KB (Fraunces normal+italic, Mona, Geist Mono), comparable
  to the retired Inter+Newsreader setup.

### Branding (applied)

- `Read/IO` — `<title>` (root template `%s — Read/IO`), logo lockup, nav brand,
  `<h1>`–`<h3>` where the name appears, footer wordmark.
- `Readio` — body copy, meta descriptions, alt/aria labels, tooltips, console copy,
  backend OpenAPI title.
- Global find-and-replace verified by grep: 0 occurrences of the legacy `ReadIO`
  spelling and 0 legacy hex values remain in `web/src` or `backend`.

## Structure (landing)

Hero (pill → h1 with italic ultramarine → lede with highlighter mark → CTAs →
mono micro-trust → **live Line Flow demo**) · source marquee (PDF/DOCX/YouTube/
Markdown/OCR/हिन्दी/ગુજરાતી) · **four chapters** (01 Line Flow — walking line under a
fixed eye; 02 ORP — pivot letter demo; 03 Any source — animated drop tray; 04 Your
pace — working WPM dial) · how it works (3 steps) · quote band (design-principle
statement, no fabricated testimonials) · stats (300 min / 12+ formats / 3 themes /
0 trackers) · FAQ (5 real Q&As, native expand/collapse) · final CTA · footer with
giant wordmark + link grid + mono colophon.

Signed-in side: AppShell, library, upload, dashboard, stats, settings restyled
entirely via tokens (no component logic touched). Reader: Paper/Ink/Sepia themes,
`dark` stored-value maps to `.theme-ink`; theme pickers now labelled
**Paper / Ink / Sepia**.

## Motion & accessibility

- Pre-paint gate adds `html.motion` only when `prefers-reduced-motion: reduce` is
  **not** set; every start state (reveal, mask-line, wordmark sweep) exists solely
  under `html.motion` → content is fully visible with JS off, with reduced motion,
  or before hydration. `suppressHydrationWarning` on `<html>` (next-themes pattern)
  for the pre-paint class injection.
- Reveal = IntersectionObserver + opacity/transform only (space always reserved →
  no CLS). Marquee/walk/parse loops pause on hover; hero demo pauses off-screen.
- Semantic HTML: `<section>/<nav>/<ol>/<figure>`, `aria-expanded`/`aria-controls`
  on FAQ, `role="switch"` toggles, `aria-label`s on icon buttons, focus-visible
  rings on every interactive element, labelled range inputs.

## Production QA results

| Gate | Result |
|---|---|
| `next build` (production) | ✅ compiles, TS clean, 15/15 routes generated |
| Unit tests (`npm test`) | ✅ **123/123** passed (9 files) |
| ESLint (`--max-warnings 0`) | ✅ 0 errors, 0 warnings |
| Console/page errors (headless, all pages × widths) | ✅ none (incl. hydration — verified clean) |
| CLS (buffered `layout-shift` observer, per page × width) | ✅ home 0.0000–0.0001, demo 0.0015–0.0033, login 0.0000 (budget < 0.1) |
| Contrast | ✅ all pairs AA on all three themes (table above) |
| Branding grep | ✅ 0 `ReadIO`, 0 emerald hexes, 0 `light:`/`dark:` variants |
| Dead CSS | ✅ removed `.card-elevated`, `.btn-paper`, `.animate-float`, `.line-loop`, `.orp-ring`, `.pace-bar` + their keyframes; remaining 56 utility classes all referenced |
| Images | ✅ sole `<img>` (reader figure) has alt + `loading="lazy"`; landing is image-free (SVG aria-hidden) |

**Performance notes.** LCP element is text (h1) with self-hosted, preloaded
variable fonts and `display: swap` fallbacks — no third-party font round-trip. INP
is structurally bounded: passive scroll listeners + rAF throttle, no long tasks in
landing critical path, demo timers are 250ms intervals (pause off-screen).
Precise CWV numbers require a real-network CrUX/RUM run; the structural budget
(LCP text-only, CLS measured ≤ 0.0033, INP work units) is in place.

### Notable fix caught by the cold check

The stored theme value `sepia` was also used as the `<html>` class — which
**silently picked up Tailwind's `sepia` filter utility** (`filter: sepia(1)` on the
entire page, turning everything pale lemon). Theme classes renamed to
`.theme-ink` / `.theme-sepia`; `THEME_CLASS` is the single source of truth.
Verified: `getComputedStyle(html).filter === "none"`, sepia bg pixel-verified
`#f1e8d7`.

## Judgment calls (disclosed)

1. **One accent colour (ultramarine `#2b3bff`)** in a white/black system: the user
   asked for modern white+black with white background; a single restrained blue is
   reserved for the ORP pivot letter, links, active states and focus — it is the
   product's literal point of focus. Black is the action (primary buttons).
2. **Ink theme kept** (`.theme-ink`, default off): dark reading remains a first-class
   choice, just no longer the default.
3. **Quote band uses a design-principle statement**, not a fabricated testimonial
   (no placeholder/invented user quotes).
4. **Theme picker labels** changed Dark/Light → Ink/Paper to match the brand
   vocabulary used in marketing; stored values unchanged (`light`/`dark`/`sepia`).
5. **Supabase migration** flips the `theme` column default to `light` for **new**
   rows only; existing user rows are untouched (a user who chose dark keeps Ink).
6. Standalone environment: no separate worker/verifier agents — stages ran
   in-process with the hard verification gates above (disclosed earlier).

## Deliverables

- Rebuilt product on this branch (commits `75f256f`, `5b55a18`).
- This report + before/after screenshots in `docs/redesign/`.
- Live preview served from the branch (`web/`, port 3000).
