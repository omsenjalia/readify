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

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fc] text-stone-900">
      <section className="relative flex flex-1 items-center overflow-hidden px-6 py-20 lg:py-28">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-16 lg:flex-row lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold lowercase tracking-[0.24em] text-indigo-600">
              same content. less time. more insight.
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight text-stone-950 lg:text-[3.85rem]">
              Read faster.
              <br />
              Think deeper.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-500">
              Upload any document and speed-read it in your browser.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {SOURCE_BADGES.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-700 shadow-sm"
                >
                  <b.icon className="h-3.5 w-3.5 text-stone-400" />
                  {b.label}
                </span>
              ))}
            </div>

            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stone-900/15 transition hover:bg-stone-800"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3.5 text-sm text-stone-400">
                No credit card required.
              </p>
            </div>
          </div>

          <div className="relative hidden h-[360px] w-[300px] shrink-0 lg:block">
            <div className="absolute inset-0 rotate-[5deg] rounded-[1.75rem] border border-stone-100 bg-white shadow-[0_30px_70px_-20px_rgba(15,23,42,0.18)]">
              <div className="flex h-full flex-col gap-3.5 p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <BookOpen className="h-4.5 w-4.5" />
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-28 rounded-full bg-stone-100" />
                    <div className="h-2 w-16 rounded-full bg-stone-50" />
                  </div>
                </div>
                {[92, 80, 88, 64, 74, 52, 68].map((w, i) => (
                  <div
                    key={i}
                    className="h-2.5 rounded-full bg-gradient-to-r from-stone-100 to-stone-50"
                    style={{ width: `${w}%` }}
                  />
                ))}
                <div className="mt-auto pt-2">
                  <div className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 py-2.5 text-center text-xs font-semibold text-white shadow-lg shadow-indigo-500/30">
                    350 wpm
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-5 -top-4 z-10 rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="h-4 w-4 text-violet-500" />
                <div>
                  <div className="text-sm font-bold leading-none text-stone-900">
                    +2.4x
                  </div>
                  <div className="mt-0.5 text-[10px] text-stone-400">
                    reading speed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200/80 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <f.icon className="h-5 w-5 text-indigo-500" strokeWidth={1.75} />
              <h3 className="text-sm font-semibold text-stone-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f7f8fc] px-6 py-20 text-center">
        <p className="font-display text-2xl italic text-stone-800 md:text-3xl">
          &ldquo;A calmer mind for a deeper you.&rdquo;
        </p>
      </section>
    </div>
  );
}
