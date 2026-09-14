import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Check,
  FileText,
  MonitorPlay,
  Type,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: docs } = await supabase
    .from("documents")
    .select(
      "id, slug, title, source_type, status, word_count, last_read_at, created_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(8);

  const recent = docs ?? [];
  const name =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.95fr] lg:items-start">
        <div className="pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Same content. Less time. More insight.
          </p>
          <h1 className="font-display mt-4 text-4xl font-medium leading-[1.1] tracking-tight text-gray-950 md:text-5xl">
            Read faster.
            <br />
            Think deeper.
          </h1>
          <p className="mt-4 max-w-md text-base text-gray-500">
            Welcome back, {name}. Upload any document and speed-read it in your
            browser.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {["PDF", "DOCX", "YouTube", "Handwritten notes"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-[#e8e0d4] bg-white px-3 py-1 text-xs font-medium text-gray-600"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Get started free
            </Link>
            <p className="mt-2 text-xs text-gray-400">No credit card required.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8e0d4] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            Upload a document
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Turn any document, video or note into a focused reading experience.
          </p>

          <div className="mt-5 flex gap-1 border-b border-gray-100 text-sm">
            {[
              { href: "/upload", label: "Document", icon: FileText, active: true },
              { href: "/upload", label: "YouTube", icon: MonitorPlay },
              { href: "/upload", label: "Text", icon: Type },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={
                  tab.active
                    ? "flex items-center gap-1.5 border-b-2 border-gray-900 px-3 py-2.5 font-semibold text-gray-900"
                    : "flex items-center gap-1.5 px-3 py-2.5 text-gray-400 transition hover:text-gray-700"
                }
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            ))}
          </div>

          <Link
            href="/upload"
            className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e0d6c8] bg-[#faf8f4] px-4 py-12 text-center transition hover:border-gray-400"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0ebe3] text-gray-500">
              <Upload className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-gray-800">
              Drop your file here or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PDF, DOCX, TXT, Markdown · Max 50MB
            </p>
          </Link>

          <Link
            href="/upload"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Upload
          </Link>
        </div>
      </div>

      <aside className="mt-8 rounded-2xl border border-[#e8e0d4] bg-white p-5">
        <p className="text-sm font-medium text-gray-900">A smarter way to read.</p>
        <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600">
          {[
            "Upload any document",
            "Focus on what matters",
            "Read faster with ORP",
            "Available on all devices",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Check className="h-3 w-3" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </aside>

      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your library</h2>
          <Link
            href="/library"
            className="text-sm text-gray-500 transition hover:text-gray-900"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e0d6c8] bg-white/60 py-14 text-center text-sm text-gray-500">
            Nothing yet —{" "}
            <Link href="/upload" className="font-semibold text-indigo-600">
              upload something
            </Link>
            .
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#e8e0d4] bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {d.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.source_type} · {(d.word_count ?? 0).toLocaleString()} words
                    · {d.status}
                  </p>
                </div>
                {d.status === "ready" ? (
                  <Link
                    href={`/c/${d.slug}`}
                    className="shrink-0 rounded-full border border-[#e8e0d4] px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-[#faf8f4]"
                  >
                    Read
                  </Link>
                ) : d.status === "error" ? (
                  <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                    Error
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    Processing
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
