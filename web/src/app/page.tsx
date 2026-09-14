import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  File,
  FileText,
  Heart,
  MonitorPlay,
  PenTool,
  Smartphone,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const SOURCE_BADGES = [
  { icon: FileText, label: "PDF" },
  { icon: File, label: "DOCX" },
  { icon: MonitorPlay, label: "YouTube" },
  { icon: PenTool, label: "Handwritten" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Speed reading done right",
    description: "RSVP with optimal recognition points.",
  },
  {
    icon: FileText,
    title: "Multiple sources",
    description: "PDF, DOCX, YouTube, Markdown.",
  },
  {
    icon: Smartphone,
    title: "Works on all your devices",
    description: "Read anywhere.",
  },
  {
    icon: Heart,
    title: "A calmer, more focused you",
    description: "Deep reading without the noise.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fc] text-gray-900">
      <section className="relative flex flex-1 items-center overflow-hidden px-6 py-16 lg:py-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold lowercase tracking-[0.22em] text-indigo-600">
              same content. less time. more insight.
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight text-gray-950 lg:text-[3.75rem]">
              Read faster.
              <br />
              Think deeper.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-gray-500">
              Upload any document and speed-read it in your browser.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {SOURCE_BADGES.map((badge) => (
                <span
                  key={badge.label}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
                >
                  <badge.icon className="h-3.5 w-3.5 text-gray-400" />
                  {badge.label}
                </span>
              ))}
            </div>

            <div className="mt-9">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition hover:bg-gray-800"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3.5 text-sm text-gray-400">No credit card required.</p>
          </div>

          <div className="relative hidden h-[340px] w-[280px] shrink-0 lg:block">
            <div className="absolute inset-0 rotate-[4deg] rounded-3xl border border-gray-100 bg-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12)]">
              <div className="flex h-full flex-col gap-3 p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 rounded-full bg-gray-100" />
                    <div className="h-2 w-16 rounded-full bg-gray-50" />
                  </div>
                </div>
                {[90, 78, 85, 62, 70, 48].map((w, i) => (
                  <div
                    key={i}
                    className="h-2.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-50"
                    style={{ width: `${w}%` }}
                  />
                ))}
                <div className="mt-auto">
                  <div className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 py-2.5 text-center text-xs font-semibold text-white shadow-md shadow-indigo-500/25">
                    350 wpm
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -top-3 z-10 rounded-2xl border border-gray-100 bg-white px-3.5 py-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-violet-500" />
                <div>
                  <div className="text-sm font-bold leading-none text-gray-900">
                    +2.4x
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-400">
                    reading speed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200/80 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col items-start gap-2">
              <feature.icon className="h-5 w-5 text-indigo-500" strokeWidth={1.75} />
              <h3 className="text-sm font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f7f8fc] px-6 py-16 text-center">
        <p className="font-display text-2xl italic tracking-tight text-gray-800 md:text-3xl">
          &ldquo;A calmer mind for a deeper you.&rdquo;
        </p>
      </section>
    </div>
  );
}
