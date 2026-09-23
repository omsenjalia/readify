import Link from "next/link";
import SiteNav from "@/components/landing/SiteNav";
import HeroDemo from "@/components/landing/HeroDemo";
import Marquee from "@/components/landing/Marquee";
import Chapters from "@/components/landing/Chapters";
import SiteFooter from "@/components/landing/SiteFooter";
import Reveal from "@/components/landing/Reveal";
import { HowItWorks, QuoteBand, Stats, Faq, FinalCta } from "@/components/landing/Sections";

/**
 * Marketing home — "Paper": white paper, near-black ink, one ultramarine
 * accent. Structure (baseline: fixmyland.ing): eyebrow → huge editorial
 * h1 with italic accent → highlighted lede → CTA + micro-trust → product
 * proof (live Line Flow demo) → source marquee → four chapters → how it
 * works → quote band → stats → FAQ → final CTA → giant wordmark footer.
 * All content is visible by default; motion only augments it.
 */
export default function HomePage() {
  return (
    <div className="bg-bg text-ink">
      <SiteNav />

      <main className="pt-16">
        {/* ---------------------------------------------------------- hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24">
          <Reveal as="div">
            <span className="pill pill-accent">
              <span className="mono uppercase tracking-[0.16em]">
                Line Flow engine · silent reading
              </span>
            </span>
            <h1 className="mask-line mt-6 text-balance text-[2.9rem] font-semibold leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl lg:text-[4.6rem]">
              <span>
                The page moves.{" "}
                <em className="italic text-accent">
                  Your eyes don&rsquo;t.
                </em>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">
              Readio reads your PDFs, textbooks, and transcripts in one
              flowing line — a word at a time, at your pace, while your eyes
              rest on a fixed point.{" "}
              <mark className="highlight">
                No hunting for line starts. No lost place.
              </mark>{" "}
              Just understanding, delivered.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start reading free
              </Link>
              <a
                href="#features"
                className="btn btn-ghost btn-lg"
              >
                See how it works
              </a>
            </div>
            <p className="mono mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
              300 free minutes a month · no card · your files stay yours
            </p>
          </Reveal>

          <Reveal delay={150}>
            <HeroDemo />
          </Reveal>
        </section>

        <Marquee />

        <Chapters />
        <HowItWorks />
        <QuoteBand />
        <Stats />
        <Faq />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}
