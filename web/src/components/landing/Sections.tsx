"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

/* ------------------------------------------------------------------ */
/* How it works — three steps, dotted connector                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: "01",
    title: "Drop it in",
    copy: "PDF, DOCX, a YouTube link, a file from your phone — Readio flattens it into a clean stream of words in seconds, OCR included.",
  },
  {
    n: "02",
    title: "Set your pace",
    copy: "Pick words-per-minute and a theme — Paper for day, Ink for night, Sepia for long hours. Everything is one keystroke away.",
  },
  {
    n: "03",
    title: "Let the page walk",
    copy: "Hit play. The pivot letter stays fixed, the line streams past it, and your eyes finally get to stop moving.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="border-y border-line bg-surface-soft/50 py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="mono mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
            How it works
          </p>
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            Three steps. The third one is the whole point.
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 120}>
              <div className="relative h-full">
                {i < STEPS.length - 1 && (
                  <span
                    className="absolute -right-3 top-7 hidden h-px w-6 border-t border-dashed border-line-strong sm:block"
                    aria-hidden="true"
                  />
                )}
                <span className="mono text-sm font-semibold text-accent">
                  {step.n}
                </span>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-xs text-pretty text-[15px] leading-relaxed text-muted">
                  {step.copy}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Quote band — the design principle, set big                           */
/* ------------------------------------------------------------------ */

export function QuoteBand() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
      <Reveal>
        <figure>
          <span
            className="mono text-[11px] font-medium uppercase tracking-[0.24em] text-subtle"
            aria-hidden="true"
          >
            Read/IO — design principle no. 01
          </span>
          <blockquote className="mt-6 text-balance text-3xl font-medium leading-[1.2] tracking-tight text-ink sm:text-5xl sm:leading-[1.15]">
            Most reading tools fight your eyes. Line Flow does the opposite —{" "}
            <em className="italic text-accent">
              it gives your eyes a home
            </em>{" "}
            and walks the text to them.
          </blockquote>
        </figure>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: "300", unit: "min", label: "free reading every month" },
  { value: "12", unit: "+", label: "source formats, OCR included" },
  { value: "3", unit: "", label: "reading themes — Paper, Ink, Sepia" },
  { value: "0", unit: "", label: "trackers, ads, or data sales" },
];

export function Stats() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal
            key={s.label}
            delay={i * 90}
            className="border-line px-5 py-10 sm:px-8 sm:py-14 [&:nth-child(even)]:border-l lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-l-0 lg:[&:nth-child(2n)]:border-l"
          >
            <div className="flex items-baseline gap-1">
              <span className="mono text-4xl font-semibold tracking-tight text-ink tabular-nums sm:text-5xl">
                {s.value}
              </span>
              <span className="mono text-lg font-semibold text-accent">
                {s.unit}
              </span>
            </div>
            <p className="mt-3 max-w-48 text-[13px] leading-snug text-muted">
              {s.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ — native details, mono index                                    */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: "Is it really free to start?",
    a: "Yes — 300 minutes of Line Flow reading every month, no card required. When you want more, it's a one-time lifetime payment. No recurring billing, ever.",
  },
  {
    q: "What can I drop in?",
    a: "PDF, DOCX, plain text, and Markdown files, plus YouTube transcripts by link. Scanned pages are handled by OCR, and Devanagari and Gujarati text are fully supported.",
  },
  {
    q: "Does it read the text aloud?",
    a: "No — Readio is built for silent reading. Your eyes stay at one fixed point while the text moves, which is much faster than any voice can speak.",
  },
  {
    q: "Are there keyboard shortcuts?",
    a: "Yes: Space to play/pause, arrow keys to step by word, [ and ] to change pace, T to cycle themes, F for fullscreen. Every reader is fully keyboard operable.",
  },
  {
    q: "Is my content private?",
    a: "Your files live in your own Supabase storage bucket, tied to your account. Nothing is shared, there are no ads, and Readio is never trained on your documents.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <p className="mono mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
          FAQ
        </p>
        <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          Short answers to the long questions.
        </h2>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-10 border-t border-line">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="group flex w-full items-center gap-4 py-5 text-left"
                >
                  <span className="mono text-[12px] font-semibold text-subtle tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`flex-1 text-base font-medium tracking-tight transition-colors sm:text-lg ${
                      isOpen ? "text-ink" : "text-muted group-hover:text-ink"
                    }`}
                  >
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-subtle transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-accent" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`faq-panel-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-6 pl-10 text-[15px] leading-relaxed text-muted">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                            */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
      <Reveal>
        <p className="mono mb-4 text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
          Ready when you are
        </p>
        <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Your eyes can{" "}
          <em className="italic text-accent">stop moving</em> now.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          Drop in anything you've been putting off reading, set a pace, and
          let the page do the walking.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn btn-primary btn-lg w-full sm:w-auto">
            Get started — it's free
          </Link>
          <Link
            href="/demo"
            className="btn btn-ghost btn-lg w-full sm:w-auto"
          >
            Try the live demo
          </Link>
        </div>
        <p className="mono mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
          300 free minutes a month · no card · one-time upgrade
        </p>
      </Reveal>
    </section>
  );
}
