import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SiteNav from "@/components/landing/SiteNav";
import RotatingWord from "@/components/landing/RotatingWord";
import HeroDemo from "@/components/landing/HeroDemo";
import Marquee from "@/components/landing/Marquee";
import FeatureTabs from "@/components/landing/FeatureTabs";
import {
  Faq,
  FinalCta,
  StatsBand,
  Steps,
} from "@/components/landing/Sections";
import SiteFooter from "@/components/landing/SiteFooter";
import Reveal from "@/components/landing/Reveal";

const ROTATING = ["papers", "textbooks", "transcripts", "anything"];

export default async function HomePage() {
  // Best-effort session probe: the landing page must render even if Supabase
  // is unreachable or env vars are missing — signed-out is the safe default.
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  } catch {
    signedIn = false;
  }

  if (signedIn) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-bg text-ink">
      <SiteNav />

      {/* ---------------- Hero ---------------- */}
      <section className="relative flex flex-col items-center overflow-hidden px-5 pb-16 pt-28 text-center sm:px-8 sm:pt-32 lg:pb-24 lg:pt-40">
        <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
          style={{ background: "var(--glow-radial)" }}
          aria-hidden="true"
        />

        <Reveal className="relative">
          <span className="pill pill-accent mx-auto !px-4 !py-1.5 text-xs font-semibold">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-accent)" }}
            />
            New — Line Flow reading
          </span>
        </Reveal>

        <Reveal delay={80} className="relative mt-6">
          <h1 className="mx-auto max-w-4xl text-[2.6rem] font-extrabold leading-[1.03] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Read{" "}
            <RotatingWord
              words={ROTATING}
              className="text-accent"
            />{" "}
            at the speed of thought.
          </h1>
        </Reveal>

        <Reveal delay={160} className="relative mt-6">
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted text-balance sm:text-lg">
            ReadIO turns PDFs, documents and YouTube transcripts into a
            focused stream that slides past a single fixed point — your eyes
            stay perfectly still, up to 800 words per minute.
          </p>
        </Reveal>

        <Reveal delay={240} className="relative mt-9">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn btn-primary btn-lg w-full sm:w-auto">
              Start reading free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#demo" className="btn btn-outline btn-lg w-full sm:w-auto">
              <PlayCircle className="h-4 w-4" />
              See it in action
            </Link>
          </div>
          <p className="mt-4 text-xs font-medium text-subtle">
            Free forever for your personal library · No credit card
          </p>
        </Reveal>

        {/* Live demo */}
        <Reveal delay={320} className="relative mt-14 w-full max-w-3xl sm:mt-16" >
          <div id="demo" className="scroll-mt-24">
            <HeroDemo />
          </div>
        </Reveal>
      </section>

      {/* ---------------- Source marquee ---------------- */}
      <Marquee />

      {/* ---------------- Features ---------------- */}
      <section id="features" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-6xl">
          <Reveal className="mb-12 text-center lg:hidden">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
              Why ReadIO
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built for focus, at speed
            </h2>
          </Reveal>
          <FeatureTabs />
        </div>
      </section>

      {/* ---------------- Eyebrow quote strip ---------------- */}
      <section className="border-y border-line bg-bg-elevated/40 px-5 py-10 text-center sm:px-8">
        <p className="mx-auto max-w-2xl text-sm font-semibold uppercase tracking-[0.2em] text-muted sm:text-base">
          Serious speed — without the serious effort
        </p>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-6xl">
          <Reveal className="mb-10 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Three steps
              <br />
              <span className="text-muted">to flow state</span>
            </h2>
          </Reveal>
          <Steps />
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="border-y border-line bg-bg-elevated/40 px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <StatsBand />
        </div>
      </section>

      {/* ---------------- Quote ---------------- */}
      <section className="px-5 py-20 text-center sm:px-8 lg:py-24">
        <Reveal>
          <p className="font-display mx-auto max-w-3xl text-2xl italic leading-snug text-ink/90 sm:text-4xl">
            &ldquo;A calmer mind for a deeper you.&rdquo;
          </p>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-subtle">
            The ReadIO promise
          </p>
        </Reveal>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="scroll-mt-20 px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto w-full max-w-6xl">
          <Reveal className="mb-10 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
              FAQ
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Questions, answered
            </h2>
          </Reveal>
          <Faq />
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto w-full max-w-6xl">
          <FinalCta />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
