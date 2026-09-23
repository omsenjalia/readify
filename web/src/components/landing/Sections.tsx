import Link from "next/link";
import { ArrowRight, Sparkles, SlidersHorizontal, Play } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: Sparkles,
    title: "Drop in anything",
    copy: "PDF, DOCX, Markdown, plain text or a YouTube link. Scanned pages go through OCR automatically.",
  },
  {
    icon: SlidersHorizontal,
    title: "Tune the flow",
    copy: "Pick Line Flow or single-word RSVP, set your speed, font size and theme. It saves itself.",
  },
  {
    icon: Play,
    title: "Press play",
    copy: "The text comes to you. Resume anywhere, on any device, exactly where you stopped.",
  },
];

export function Steps() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {STEPS.map((step, i) => (
        <Reveal key={step.title} delay={i * 90}>
          <div className="card relative h-full overflow-hidden p-6">
            <span
              className="font-display absolute -right-1 -top-5 text-[7rem] font-semibold leading-none text-ink/[0.045]"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <step.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h3 className="relative mt-4 text-base font-bold tracking-tight text-ink">
              {step.title}
            </h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted">
              {step.copy}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stats band                                                          */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: "2–3×", label: "faster than normal reading, once you're warm" },
  { value: "0 px", label: "of eye travel — the pivot never moves" },
  { value: "800", label: "words per minute at the top of the dial" },
  { value: "5+", label: "source types, including OCR and transcripts" },
];

export function StatsBand() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {STATS.map((stat, i) => (
        <Reveal key={stat.label} delay={i * 70} className="text-center lg:text-left">
          <div
            className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl"
            style={{
              background:
                "linear-gradient(120deg, var(--color-accent-text), var(--color-accent-strong))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {stat.value}
          </div>
          <p className="mx-auto mt-2 max-w-[24ch] text-[13px] leading-relaxed text-muted lg:mx-0">
            {stat.label}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ (no JS — details/summary)                                       */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: "What is RSVP speed reading?",
    a: "Rapid Serial Visual Presentation shows text one word at a time in a fixed position. Because your eyes never saccade across a page, you skip the biggest hidden cost of normal reading — eye movement — and pace is fully controlled.",
  },
  {
    q: "What is the ORP?",
    a: "The Optimal Recognition Point is the character within a word that your visual system locks onto first — usually slightly left of centre. Readio measures real text metrics and pins that character to the focus axis, which is why words feel instant rather than blurry.",
  },
  {
    q: "How is Line Flow different from one-word mode?",
    a: "One-word mode flashes single words; Line Flow shows the entire line and slides it under the same fixed pivot. You keep peripheral context — the shape of the sentence — while your eye still never moves. Most readers find Line Flow more comfortable at high speeds.",
  },
  {
    q: "Which files can I read?",
    a: "PDF, DOCX, TXT and Markdown uploads, pasted text, and YouTube links (read the transcript). Image-only scanned PDFs are OCR'd automatically. Figures and formulas pause playback so you can actually look at them.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes — the reader is built mobile-first: swipe or tap the screen edges to step words, tap the centre to play/pause, and all controls live in thumb reach with a bottom sheet for settings.",
  },
  {
    q: "Is my library private?",
    a: "Every document is private by default and readable only by you. Sharing is opt-in per document: flip visibility to public and send the link — progress still stays yours.",
  },
];

export function Faq() {
  return (
    <div className="mx-auto max-w-3xl">
      {FAQS.map((item) => (
        <details
          key={item.q}
          className="group border-b border-line"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[15px] font-semibold text-ink transition hover:text-accent [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-muted transition group-open:rotate-45 group-open:border-accent group-open:text-accent"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p className="pb-5 pr-10 text-sm leading-relaxed text-muted">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-line bg-bg-elevated px-6 py-16 text-center sm:px-16 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--glow-radial)" }}
        aria-hidden="true"
      />
      <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden="true" />
      <Reveal className="relative">
        <h2 className="mx-auto max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Your next book just got{" "}
          <span className="text-accent">a lot shorter.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Create a free account, drop in your first document, and feel the
          difference in under a minute.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn btn-outline btn-lg">
            Log in
          </Link>
        </div>
        <p className="mt-4 text-xs font-medium text-subtle">
          No credit card. Private by default.
        </p>
      </Reveal>
    </div>
  );
}
