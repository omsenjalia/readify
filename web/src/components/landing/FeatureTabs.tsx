"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  Check,
  Crosshair,
  Gauge,
  Rows3,
  Upload,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Panel visuals — pure CSS/SVG mocks, no images                       */
/* ------------------------------------------------------------------ */

function LineFlowVisual() {
  const words = ["the", "line", "slides", "beneath", "a", "still", "eye"];
  return (
    <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-line bg-bg p-6">
      <div
        className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-accent) 55%, transparent), transparent)",
        }}
      />
      <div className="absolute left-1/2 top-5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent" />
      <div className="fade-x flex w-full items-center justify-center gap-3 text-xl font-semibold">
        {words.map((w, i) => {
          const isFocus = i === 3;
          return (
            <span
              key={w}
              className={clsx(
                "transition",
                isFocus ? "text-ink" : i < 3 ? "text-ink/25" : "text-ink/50",
              )}
            >
              {isFocus ? (
                <>
                  be<span className="font-extrabold text-accent">n</span>eath
                </>
              ) : (
                w
              )}
            </span>
          );
        })}
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
        eye stays here
      </div>
    </div>
  );
}

function OrpVisual() {
  return (
    <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-line bg-bg p-6">
      <div
        className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-accent) 45%, transparent), transparent)",
        }}
      />
      <span className="relative text-5xl font-bold tracking-tight text-ink/80">
        READ
        <span className="relative font-extrabold text-accent">
          I
          <span className="absolute -inset-x-1.5 -inset-y-1 rounded-lg border border-accent/40" />
        </span>
        NG
      </span>
      <div className="absolute bottom-4 flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
        <Crosshair className="h-3 w-3 text-accent" />
        optimal recognition point
      </div>
    </div>
  );
}

function SourcesVisual() {
  const chips = ["PDF", "DOCX", "YouTube", "Markdown", "TXT", "Scanned OCR"];
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-bg p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Upload className="h-5 w-5" />
      </span>
      <div className="flex max-w-xs flex-wrap items-center justify-center gap-2">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted"
          >
            {c}
          </span>
        ))}
      </div>
      <p className="text-[11px] font-medium text-subtle">
        one library, every source
      </p>
    </div>
  );
}

function PaceVisual() {
  const bars = [
    { label: "200", h: 22 },
    { label: "400", h: 40 },
    { label: "600", h: 62 },
    { label: "800", h: 88 },
  ];
  return (
    <div className="flex h-44 flex-col justify-center rounded-2xl border border-line bg-bg p-6">
      <div className="flex items-end justify-center gap-4">
        {bars.map((b, i) => (
          <div key={b.label} className="flex flex-col items-center gap-2">
            <div
              className="w-10 rounded-t-lg"
              style={{
                height: b.h,
                background:
                  i === bars.length - 1
                    ? "linear-gradient(to top, var(--color-accent-strong), var(--color-accent))"
                    : "var(--color-surface-soft)",
                border: "1px solid var(--color-line)",
                borderBottom: "none",
              }}
            />
            <span
              className={clsx(
                "text-[10px] font-bold tabular-nums",
                i === bars.length - 1 ? "text-accent" : "text-subtle",
              )}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] font-medium text-subtle">
        words per minute — find your ceiling
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

interface Feature {
  id: string;
  tab: string;
  icon: ReactNode;
  title: string;
  copy: string;
  bullets: string[];
  visual: ReactNode;
}

const FEATURES: Feature[] = [
  {
    id: "line-flow",
    tab: "Line Flow",
    icon: <Rows3 className="h-4 w-4" />,
    title: "The whole line. One fixation.",
    copy: "Instead of flashing single words, Line Flow keeps the entire line visible and slides it beneath a fixed focal point. Context lives in your peripheral vision exactly where your brain expects it.",
    bullets: [
      "Zero eye movement — the pivot never shifts",
      "Surrounding words stay visible for context",
      "Smooth, rhythm-preserving slide between words",
    ],
    visual: <LineFlowVisual />,
  },
  {
    id: "orp",
    tab: "ORP precision",
    icon: <Crosshair className="h-4 w-4" />,
    title: "Pixel-perfect recognition point.",
    copy: "Every word has an Optimal Recognition Point — the character your brain locks onto first. ReadIO measures real text metrics per script (Latin, Devanagari, Gujarati) and lands that character on the centre axis, every single time.",
    bullets: [
      "Measured alignment, never guessed columns",
      "Unicode-aware — works with हिन्दी and ગુજરાતી",
      "Toggle the highlight off if you prefer it clean",
    ],
    visual: <OrpVisual />,
  },
  {
    id: "sources",
    tab: "Any source",
    icon: <Upload className="h-4 w-4" />,
    title: "Everything you already read.",
    copy: "Drop in a PDF or DOCX, paste raw text or Markdown, or link a YouTube video and read its transcript. Scanned documents go through OCR automatically — figures and formulas pause themselves so you never miss them.",
    bullets: [
      "PDF, DOCX, TXT, Markdown, YouTube transcripts",
      "OCR for scanned, image-only pages",
      "Figures and equations auto-pause for 15s",
    ],
    visual: <SourcesVisual />,
  },
  {
    id: "pace",
    tab: "Your pace",
    icon: <Gauge className="h-4 w-4" />,
    title: "Speed that adapts to you.",
    copy: "Warm up at 200 WPM, cruise at 400, sprint at 800. Progress saves per document on every device, so your library always knows exactly where you stopped — down to the word.",
    bullets: [
      "100–800 WPM with keyboard, slider or presets",
      "Per-document resume, synced across devices",
      "Reading stats: words read, averages, streaks",
    ],
    visual: <PaceVisual />,
  },
];

/**
 * The "Why ReadIO" block — a cerebrium-style tab rail beside a large
 * one-phrase-per-line display heading, with visual panels on the right.
 */
export default function FeatureTabs() {
  const [active, setActive] = useState(0);
  const feature = FEATURES[active];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      {/* Left rail */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
          Why ReadIO
        </p>
        <h2 className="mt-4 text-4xl font-extrabold leading-[1.04] tracking-tight text-ink sm:text-5xl">
          Built
          <br />
          for focus,
          <br />
          <span className="text-muted">at speed</span>
        </h2>

        {/* Tabs: vertical rail on desktop, scroller on mobile */}
        <div
          className="mt-8 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
          role="tablist"
          aria-label="Features"
        >
          {FEATURES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={clsx(
                "flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold transition lg:w-full lg:shrink",
                i === active
                  ? "border-accent/40 bg-accent-soft text-ink"
                  : "border-line bg-surface/40 text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              <span className={i === active ? "text-accent" : "text-subtle"}>
                {f.icon}
              </span>
              {f.tab}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div role="tabpanel" aria-label={feature.tab} className="min-w-0">
        {feature.visual}
        <h3 className="mt-6 text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {feature.title}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {feature.copy}
        </p>
        <ul className="mt-5 space-y-2.5">
          {feature.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ink/90">
              <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                <Check className="h-3 w-3 text-accent" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
