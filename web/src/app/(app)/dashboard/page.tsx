import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Heart,
  MonitorPlay,
  Smartphone,
  Star,
  Type,
  Upload,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function typeBadge(source: string) {
  const s = (source || "").toLowerCase();
  if (s === "pdf")
    return (
      <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
        PDF
      </span>
    );
  if (s === "docx")
    return (
      <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
        DOCX
      </span>
    );
  if (s === "youtube")
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
        <MonitorPlay className="h-3 w-3" />
      </span>
    );
  return (
    <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-stone-600">
      Text
    </span>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: docs } = await supabase
    .from("documents")
    .select(
      "id, slug, title, source_type, status, word_count, last_read_at, is_favorite, created_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(8);

  const recent = docs ?? [];
  const resume = recent.find((d) => d.status === "ready") ?? recent[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 md:px-6 md:pt-12">
      {/* Hero + upload */}
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
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
            Upload any document and speed-read it in your browser.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["PDF", "DOCX", "YouTube", "Handwritten notes"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm"
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
              {
                href: "/upload",
                label: "YouTube",
                icon: MonitorPlay,
                on: false,
              },
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
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-4 py-14 text-center transition hover:border-[var(--muted)]"
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

      {/* Library + resume preview */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-[var(--ink)]">
              Your library
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/library"
                className="hidden rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--muted)] shadow-sm sm:block"
              >
                Search your documents…
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Link>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="card border-dashed py-16 text-center text-sm text-[var(--muted)]">
              Nothing yet —{" "}
              <Link href="/upload" className="font-semibold text-indigo-600">
                upload something
              </Link>
              .
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="hidden px-3 py-3 font-semibold sm:table-cell">
                      Type
                    </th>
                    <th className="hidden px-3 py-3 font-semibold md:table-cell">
                      Words
                    </th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-[var(--line)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {typeBadge(d.source_type)}
                          <Link
                            href={
                              d.status === "ready" ? `/c/${d.slug}` : "/library"
                            }
                            className="font-medium text-[var(--ink)] hover:underline"
                          >
                            {d.title}
                          </Link>
                          {d.is_favorite ? (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell">
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--muted)]">
                          {d.source_type}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-[var(--muted)] md:table-cell">
                        {(d.word_count ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {d.status === "ready" ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Ready
                          </span>
                        ) : d.status === "error" ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            Error
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            Processing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resume / focus card */}
        <div className="card-elevated flex min-h-[280px] flex-col p-6">
          {resume && resume.status === "ready" ? (
            <>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {resume.title}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {(resume.word_count ?? 0).toLocaleString()} words ·{" "}
                  {resume.source_type}
                </p>
              </div>
              <div className="mt-auto flex flex-1 flex-col items-center justify-center py-8">
                <p className="font-display text-4xl tracking-tight text-[var(--ink)]">
                  <span className="text-[var(--muted)]/40">re</span>
                  <span className="text-indigo-600">a</span>
                  <span className="text-[var(--ink)]">d</span>
                </p>
                <p className="mt-6 text-[11px] text-[var(--muted)]">
                  ← → or Space to play/pause
                </p>
              </div>
              <Link
                href={`/c/${resume.slug}`}
                className="mt-2 flex w-full items-center justify-center rounded-full bg-[var(--ink)] py-2.5 text-sm font-semibold text-white hover:bg-black"
              >
                Continue reading
              </Link>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="font-display text-3xl text-[var(--ink)]">focus</p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Upload a document to start reading
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Quote + features */}
      <section className="card mt-12 flex flex-col gap-8 p-6 md:flex-row md:items-center md:gap-12 md:p-8">
        <p className="font-display max-w-xs text-2xl italic leading-snug text-[var(--ink)]">
          &ldquo;A calmer mind for a deeper you.&rdquo;
        </p>
        <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            {
              icon: Zap,
              title: "Speed reading done right",
              desc: "RSVP with optimal recognition points.",
            },
            {
              icon: FileText,
              title: "Multiple sources",
              desc: "PDF, DOCX, YouTube, notes.",
            },
            {
              icon: Smartphone,
              title: "Works on all your devices",
              desc: "Read anywhere.",
            },
            {
              icon: Heart,
              title: "A calmer, more focused you",
              desc: "Deep reading without the noise.",
            },
          ].map((f) => (
            <div key={f.title}>
              <f.icon className="h-4 w-4 text-indigo-500" strokeWidth={1.75} />
              <p className="mt-2 text-xs font-semibold text-[var(--ink)]">
                {f.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
