import { redirect } from "next/navigation";
import Link from "next/link";
import {
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
    .limit(6);

  const recent = docs ?? [];
  const name =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 md:px-6 md:pt-14">
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        {/* Left — editorial hero */}
        <div className="max-w-lg pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">
            Same content. Less time. More insight.
          </p>
          <h1 className="font-display mt-5 text-[2.75rem] leading-[1.08] text-[var(--ink)] md:text-[3.35rem]">
            Read faster.
            <br />
            Think deeper.
          </h1>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--muted)]">
            Welcome back, {name}. Upload any document and speed-read it in your
            browser.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {["PDF", "DOCX", "YouTube", "Handwritten notes"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-9">
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-black/10 transition hover:bg-black"
            >
              Get started free
            </Link>
            <p className="mt-3 text-sm text-[var(--muted)]">
              No credit card required.
            </p>
          </div>
        </div>

        {/* Right — upload card */}
        <div className="card-elevated overflow-hidden">
          <div className="border-b border-[var(--line)] px-6 pb-4 pt-6">
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Upload a document
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Turn any document, video or note into a focused reading
              experience.
            </p>
          </div>

          <div className="flex border-b border-[var(--line)] px-2 text-sm">
            {[
              { href: "/upload", label: "Document", icon: FileText, on: true },
              { href: "/upload", label: "YouTube", icon: MonitorPlay, on: false },
              { href: "/upload", label: "Text", icon: Type, on: false },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={
                  tab.on
                    ? "relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3.5 font-semibold text-[var(--ink)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--ink)]"
                    : "flex flex-1 items-center justify-center gap-1.5 px-2 py-3.5 text-[var(--muted)] transition hover:text-[var(--ink)]"
                }
              >
                <tab.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="p-6">
            <Link
              href="/upload"
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-4 py-14 text-center transition hover:border-[var(--muted)] hover:bg-[#f7f3ec]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efeae1] text-[var(--muted)]">
                <Upload className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-4 text-sm font-semibold text-[var(--ink)]">
                Drop your file here or click to browse
              </p>
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                PDF, DOCX, TXT, Markdown · Max 50MB
              </p>
            </Link>

            <Link
              href="/upload"
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[var(--ink)] py-3.5 text-sm font-semibold text-white transition hover:bg-black"
            >
              Upload
            </Link>
          </div>
        </div>
      </div>

      {/* Library preview */}
      <section className="mt-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
            Your library
          </h2>
          <Link
            href="/library"
            className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="card flex flex-col items-center justify-center border-dashed py-16 text-center">
            <p className="text-sm text-[var(--muted)]">
              Nothing yet —{" "}
              <Link
                href="/upload"
                className="font-semibold text-indigo-600 hover:underline"
              >
                upload something
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((d) => (
              <div
                key={d.id}
                className="card flex items-center justify-between gap-3 px-5 py-4 transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">
                    {d.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {d.source_type}
                    {d.word_count
                      ? ` · ${d.word_count.toLocaleString()} words`
                      : ""}
                    {" · "}
                    {d.status}
                  </p>
                </div>
                {d.status === "ready" ? (
                  <Link
                    href={`/c/${d.slug}`}
                    className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[#efeae1]"
                  >
                    Read
                  </Link>
                ) : d.status === "error" ? (
                  <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                    Error
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                    Processing
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
