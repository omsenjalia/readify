"use client";

import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import Reveal from "@/components/landing/Reveal";

/**
 * The four chapters — the feature tour, told as a sequence of full-width
 * editorial rows. Each pairs a mask-revealed display headline with a small
 * self-animating (and where useful, interactive) visual built from the real
 * product behaviour. No feature cards, no tabs.
 */

/* ------------------------------------------------------------------ */
/* Shared row                                                          */
/* ------------------------------------------------------------------ */

function ChapterRow({
  n,
  eyebrow,
  title,
  copy,
  children,
  reverse = false,
}: {
  n: string;
  eyebrow: string;
  title: ReactNode;
  copy: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="border-t border-line">
      <div
        className={clsx(
          "mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-16",
        )}
      >
        <Reveal as="div" className={clsx(reverse && "lg:order-2")}>
          <div className="mb-4 flex items-center gap-4">
            <span className="mono text-sm font-semibold text-accent">
              {n}
            </span>
            <span className="flex-1 max-w-16 border-t border-line" aria-hidden="true" />
            <span className="mono text-[11px] font-medium uppercase tracking-[0.22em] text-subtle">
              {eyebrow}
            </span>
          </div>
          <h2 className="mask-line text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            <span>{title}</span>
          </h2>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted sm:text-lg">
            {copy}
          </p>
        </Reveal>
        <div className={clsx("relative w-full", reverse && "lg:order-1")}>
          <span
            aria-hidden="true"
            className="chapter-num pointer-events-none absolute -top-9 right-0 select-none text-[110px] leading-none sm:-top-14 sm:text-[160px]"
          >
            {n}
          </span>
          <Reveal delay={120} className="relative">
            {children}
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function VisualCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Line flow visual: text walks past a fixed eye                  */
/* ------------------------------------------------------------------ */

const LINE_WORDS =
  "no searching no skipping back no lost place just a steady rhythm that keeps getting faster until reading feels like thinking and your eyes have finally gone home".split(
    " ",
  );

function LineFlowVisual() {
  return (
    <VisualCard>
      <div className="px-5 pt-4 sm:px-6">
        <p className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
          Fig. 01 — the page walks, the eye stays
        </p>
      </div>
      <div className="line-flow group relative mx-5 my-6 overflow-hidden rounded-xl border border-line bg-bg px-0 py-5 sm:mx-6">
        {/* fixed focus window */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-52 -translate-x-1/2">
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent) 7%, transparent) 35%, color-mix(in srgb, var(--color-accent) 10%, transparent) 50%, color-mix(in srgb, var(--color-accent) 7%, transparent) 65%, transparent)",
            }}
          />
          <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-accent/40" />
          <span
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)]"
            aria-hidden="true"
          />
        </div>
        {/* walking line */}
        <div className="walk-track animate-walk relative flex w-max items-center gap-6">
          {[false, true].map((hidden) => (
            <div
              key={String(hidden)}
              className="flex shrink-0 items-center gap-6"
              aria-hidden={hidden || undefined}
            >
              {LINE_WORDS.map((w, i) => (
                <span
                  key={i}
                  className="whitespace-nowrap text-[19px] font-medium tracking-tight text-ink/55"
                >
                  {w}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-5 pb-4 sm:px-6">
        <p className="text-sm text-muted">Your eyes never have to move.</p>
        <p className="mono hidden text-[11px] text-subtle sm:block">
          hover to pause
        </p>
      </div>
    </VisualCard>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — ORP visual: the pivot letter                                   */
/* ------------------------------------------------------------------ */

const ORP_WORDS = ["steady", "rhythm", "no", "lost", "place"];
const ORP_PIVOTS = [2, 2, 1, 1, 3]; // pivot letter index per word

function OrpVisual() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((v) => (v + 1) % ORP_WORDS.length),
      700,
    );
    return () => clearInterval(id);
  }, []);

  const word = ORP_WORDS[i];
  const pivot = ORP_PIVOTS[i];

  return (
    <VisualCard>
      <div className="px-5 pt-4 sm:px-6">
        <p className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
          Fig. 02 — the pivot letter (ORP)
        </p>
      </div>
      <div className="relative flex min-h-48 flex-col items-center justify-center gap-5 px-6 py-10 sm:min-h-56">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--glow-radial)" }}
          aria-hidden="true"
        />
        <span className="mono relative text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">
          your eye sits here
          <span
            className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent"
            aria-hidden="true"
          />
        </span>
        <div
          key={i}
          className="word-swap-in relative text-[44px] font-semibold leading-none tracking-tight text-ink sm:text-6xl"
          aria-label={word}
        >
          {word.slice(0, pivot)}
          <span className="text-accent">{word[pivot]}</span>
          {word.slice(pivot + 1)}
        </div>
        <div className="mono relative flex gap-3 text-[11px] font-medium uppercase tracking-[0.16em]">
          {ORP_WORDS.map((w, j) => (
            <span
              key={j}
              className={clsx(
                "transition-colors duration-300",
                j === i ? "text-ink" : "text-subtle/50",
              )}
              aria-hidden="true"
            >
              {w}
            </span>
          ))}
        </div>
      </div>
      <div className="px-5 pb-4 sm:px-6">
        <p className="text-sm text-muted">
          The accent letter is where your attention already is. Everything is
          laid out so it arrives exactly there.
        </p>
      </div>
    </VisualCard>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — Any source visual: the drop tray                               */
/* ------------------------------------------------------------------ */

const SOURCES = [
  { label: "thesis.pdf", size: "4.2 MB" },
  { label: "lecture-04.docx", size: "88 KB" },
  { label: "youtube · 42:17", size: "transcript" },
  { label: "notes.md", size: "12 KB" },
  { label: "scan-ocr.txt", size: "9 pages" },
];

function SourceVisual() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % SOURCES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <VisualCard>
      <div className="px-5 pt-4 sm:px-6">
        <p className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
          Fig. 03 — any source, one drop
        </p>
      </div>
      <div className="px-5 py-6 sm:px-6">
        <div className="space-y-2.5">
          {SOURCES.map((s, j) => (
            <div
              key={s.label}
              className={clsx(
                "flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-500",
                j === active
                  ? "border-accent/50 bg-accent-soft"
                  : "border-line bg-bg",
              )}
            >
              <span
                className={clsx(
                  "mono text-[12px] font-medium sm:text-[13px]",
                  j === active ? "text-ink" : "text-subtle",
                )}
              >
                {s.label}
              </span>
              {j === active ? (
                <span className="relative h-1 w-24 overflow-hidden rounded-full bg-line">
                  <span className="animate-parse absolute inset-y-0 left-0 rounded-full bg-accent" />
                </span>
              ) : (
                <span className="mono text-[11px] text-subtle/70">{s.size}</span>
              )}
            </div>
          ))}
        </div>
        <p className="mono mt-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
          <span
            className={clsx(
              "inline-block h-1.5 w-1.5 rounded-full transition-colors duration-500",
              active % 2 === 0 ? "bg-success" : "bg-accent",
            )}
            aria-hidden="true"
          />
          parsed · flattened · ready to read
        </p>
      </div>
    </VisualCard>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Your pace visual: the WPM dial                                 */
/* ------------------------------------------------------------------ */

function paceLabel(wpm: number) {
  if (wpm < 160) return "Slow study — take it in";
  if (wpm < 260) return "Comfortable reading";
  if (wpm < 420) return "Focused work pace";
  if (wpm < 700) return "Speed-reading";
  return "Blink and it's over";
}

function PaceVisual() {
  const [wpm, setWpm] = useState(240);

  return (
    <VisualCard>
      <div className="flex items-center justify-between px-5 pt-4 sm:px-6">
        <p className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
          Fig. 04 — your pace
        </p>
        <span className="mono text-[11px] text-subtle">drag it</span>
      </div>
      <div className="px-5 py-6 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mono text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums sm:text-6xl">
              {wpm}
            </div>
            <div className="mono mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">
              words / minute
            </div>
          </div>
          <p className="max-w-40 text-right text-sm leading-snug text-muted">
            {paceLabel(wpm)}
          </p>
        </div>
        <input
          type="range"
          min={60}
          max={1000}
          step={10}
          value={wpm}
          onChange={(e) => setWpm(Number(e.target.value))}
          aria-label="Words per minute"
          className="w-full"
        />
        <div className="mono mt-3 flex justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-subtle/70">
          <span>60</span>
          <span>250</span>
          <span>500</span>
          <span>750</span>
          <span>1000</span>
        </div>
      </div>
    </VisualCard>
  );
}

/* ------------------------------------------------------------------ */

export default function Chapters() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl">
      <div className="mx-auto w-full max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
        <p className="mono mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
          The tour — four chapters
        </p>
        <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          Everything Readio does fits in four ideas.
        </h2>
      </div>

      <div className="mt-10 sm:mt-14">
        <ChapterRow
          n="01"
          eyebrow="Line flow"
          title={
            <>
              The page reads{" "}
              <em className="italic text-accent">at</em> you
            </>
          }
          copy="Text scrolls in one continuous line while your eyes rest on a fixed point. No saccades, no skipped words, no hunting for line starts — the reading position is a place, not a search."
        >
          <LineFlowVisual />
        </ChapterRow>

        <ChapterRow
          reverse
          n="02"
          eyebrow="Optimal recognition point"
          title={
            <>
              Every letter arrives{" "}
              <em className="italic">exactly</em> where your eyes are
            </>
          }
          copy="Readio's layout engine places the pivot letter — the character your recognition actually locks on to — dead centre, every word. It's the difference between a page that demands attention and one that receives it."
        >
          <OrpVisual />
        </ChapterRow>

        <ChapterRow
          n="03"
          eyebrow="Any source"
          title={
            <>
              PDF, DOCX, YouTube, <em className="italic">anything</em>
            </>
          }
          copy="Drop a paper, a textbook chapter, a meeting transcript or a YouTube link. Scanned pages go through OCR; Devanagari and Gujarati are first-class. One drop gives you a clean reading stream."
        >
          <SourceVisual />
        </ChapterRow>

        <ChapterRow
          reverse
          n="04"
          eyebrow="Your pace"
          title={
            <>
              From slow study to <em className="italic">blinking</em>
            </>
          }
          copy="Set the words-per-minute once and the engine paces every word to it — from 60 for dense study to 1,000 for a first skim. Switch between Paper for day and Ink for night without losing your place."
        >
          <PaceVisual />
        </ChapterRow>
      </div>
    </section>
  );
}
