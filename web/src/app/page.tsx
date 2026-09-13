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
    description: "PDF, DOCX, YouTube.",
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
    redirect("/library");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Hero */}
      <section className="relative flex flex-1 items-center overflow-hidden px-6 py-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 lg:flex-row lg:items-center">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="text-xs font-semibold lowercase tracking-[0.2em] text-indigo-600">
              Same content. Less time. More insight.
            </p>
            <h1 className="mt-4 text-5xl font-bold tracking-tight text-gray-900 lg:text-6xl">
              Read faster.
              <br />
              Think deeper.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Upload any document and speed-read it in your browser.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {SOURCE_BADGES.map((badge) => (
                <span
                  key={badge.label}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
                >
                  <badge.icon className="h-4 w-4 text-gray-500" />
                  {badge.label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              No credit card required.
            </p>
          </div>

          {/* Floating card stack (CSS only) */}
          <div className="relative hidden h-80 w-64 shrink-0 lg:block">
            <div className="absolute inset-0 -rotate-6 rounded-2xl border border-gray-200 bg-white shadow-lg">
              <div className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="h-2 w-20 rounded bg-gray-200" />
                    <div className="mt-1 h-1.5 w-14 rounded bg-gray-100" />
                  </div>
                </div>
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div
                      className="h-2 rounded bg-gray-200"
                      style={{ width: `${[90, 80, 70, 60][i]}%` }}
                    />
                    <div className="mt-1.5 h-2 rounded bg-gray-100" style={{ width: `${[70, 60, 50, 40][i]}%` }} />
                  </div>
                ))}
                <div className="mt-auto rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-center text-xs font-semibold text-white">
                  350 wpm
                </div>
              </div>
            </div>
            <div className="absolute inset-y-0 left-10 top-4 z-[-1] -rotate-3 rounded-2xl border border-gray-200 bg-white shadow-lg">
              <div className="flex h-full w-full flex-col gap-3 p-5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-2.5 rounded bg-gray-200" style={{ width: `${[85, 65, 90, 55][i % 4]}%` }} />
                ))}
                <div className="mt-auto flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
                    Y
                  </span>
                  <div>
                    <div className="h-2 w-16 rounded bg-gray-200" />
                    <div className="mt-1 h-1.5 w-10 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-6 -top-6 z-10 rotate-6 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-sm font-bold text-gray-900">+2.4x</div>
                  <div className="text-[10px] text-gray-500">reading speed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col items-start gap-2">
              <feature.icon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pull quote + CTAs */}
      <section className="flex flex-col items-center gap-6 bg-gray-50 px-6 py-16 text-center">
        <p className="max-w-2xl text-2xl italic text-gray-800">
          &ldquo;A calmer mind for a deeper you.&rdquo;
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-700 hover:to-purple-700"
          >
            Sign up free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Log in
          </Link>
        </div>
      </section>
    </div>
  );
}