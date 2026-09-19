import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Gauge,
  Library as LibraryIcon,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_FORMATS_LABEL } from "@/lib/constants";
import SourceBadge from "@/components/SourceBadge";
import { pctComplete } from "@/lib/progress";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: docs }, { data: sessionRows }] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, slug, title, source_type, status, word_count, last_read_at, is_favorite, created_at",
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("reading_sessions")
      .select("document_id, word_index, wpm")
      .eq("user_id", user.id),
  ]);

  const recent = docs ?? [];
  const sessions = new Map(
    (sessionRows ?? []).map((s) => [s.document_id, s]),
  );

  // Best resume candidate: a ready document that's started but not finished,
  // falling back to the most recent ready document.
  const candidates = recent
    .filter((d) => d.status === "ready")
    .map((d) => {
      const s = sessions.get(d.id);
      return {
        doc: d,
        pct: s ? pctComplete(s.word_index, d.word_count ?? 0) : 0,
        wpm: s?.wpm ?? null,
      };
    });
  const resume =
    candidates.find((c) => c.pct > 0 && c.pct < 95) ?? candidates[0] ?? null;

  const totalWords = recent.reduce((sum, d) => sum + (d.word_count ?? 0), 0);
  const name =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
      {/* Greeting */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Welcome back, <span className="text-accent">{name}</span>.
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-muted">
            Turn any document, video or note into a focused reading flow.
          </p>
        </div>
        <Link href="/upload" className="btn btn-primary btn-md">
          <Upload className="h-4 w-4" />
          New upload
        </Link>
      </header>

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <QuickStat
          icon={LibraryIcon}
          value={String(recent.length)}
          label="in library"
        />
        <QuickStat
          icon={BookOpen}
          value={totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : String(totalWords)}
          label="words loaded"
        />
        <QuickStat
          icon={Gauge}
          value={resume?.wpm ? String(resume.wpm) : "—"}
          label="last WPM"
        />
      </div>

      {/* Continue reading */}
      {resume && (
        <Link
          href={`/c/${resume.doc.slug}`}
          className="card group relative mb-6 block overflow-hidden p-5 transition hover:border-accent/40 sm:p-6"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
            style={{ background: "var(--glow-radial)" }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <SourceBadge type={resume.doc.source_type} size="lg" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  {resume.pct > 0 ? "Continue reading" : "Start reading"}
                </p>
                <p className="mt-1 truncate text-base font-bold text-ink sm:text-lg">
                  {resume.doc.title}
                </p>
                <p className="mt-0.5 text-xs text-muted tabular-nums">
                  {(resume.doc.word_count ?? 0).toLocaleString()} words
                  {resume.pct > 0 && ` · ${resume.pct}% done`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              {resume.pct > 0 && (
                <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-surface-soft sm:w-40">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${resume.pct}%` }}
                  />
                </div>
              )}
              <span className="btn btn-primary btn-sm shrink-0">
                {resume.pct > 0 ? "Resume" : "Read"}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Upload strip */}
      <Link
        href="/upload"
        className="card group mb-8 flex flex-col items-center justify-center border-dashed !border-line-strong px-4 py-10 text-center transition hover:border-accent/50 sm:py-12"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition group-hover:scale-105">
          <Upload className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="mt-3.5 text-sm font-bold text-ink">
          Drop a file, paste text, or link a video
        </p>
        <p className="mt-1 text-xs text-muted">
          {`Supported: ${SUPPORTED_FORMATS_LABEL} · YouTube · up to 50MB`}
        </p>
      </Link>

      {/* Recent uploads */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-ink">
            Recent uploads
          </h2>
          <Link
            href="/library"
            className="flex items-center gap-1 text-sm font-semibold text-accent transition hover:gap-2"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="card flex flex-col items-center border-dashed !border-line-strong py-14 text-center">
            <Flame className="h-7 w-7 text-subtle" />
            <p className="mt-3 text-sm text-muted">
              Nothing yet —{" "}
              <Link href="/upload" className="font-semibold text-accent hover:underline">
                upload something
              </Link>{" "}
              to get flowing.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {recent.map((d) => {
              const s = sessions.get(d.id);
              const pct = s ? pctComplete(s.word_index, d.word_count ?? 0) : 0;
              return (
                <li key={d.id}>
                  <Link
                    href={d.status === "ready" ? `/c/${d.slug}` : "/library"}
                    className="card flex items-center gap-3 px-4 py-3.5 transition hover:border-accent/40"
                  >
                    <SourceBadge type={d.source_type} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {d.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted tabular-nums">
                        {(d.word_count ?? 0).toLocaleString()} words
                        {pct > 0 && pct < 95 && ` · ${pct}% read`}
                      </p>
                    </div>
                    {d.status === "ready" ? (
                      pct >= 95 ? (
                        <span className="pill !text-[11px]">
                          <span className="text-accent">✓</span> Done
                        </span>
                      ) : (
                        <span className="btn btn-outline !px-3.5 !py-1.5 text-xs">
                          {pct > 0 ? "Resume" : "Read"}
                        </span>
                      )
                    ) : d.status === "error" ? (
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          background: "var(--color-danger-soft)",
                          color: "var(--color-danger)",
                        }}
                      >
                        Error
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
                        Processing
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Quote */}
      <p className="font-display mt-14 text-center text-xl italic text-ink/70 md:text-2xl">
        &ldquo;A calmer mind for a deeper you.&rdquo;
      </p>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Gauge;
  value: string;
  label: string;
}) {
  return (
    <div className="card flex flex-col items-start gap-1.5 p-4 sm:flex-row sm:items-center sm:gap-3 sm:p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-extrabold tracking-tight text-ink tabular-nums">
          {value}
        </span>
        <span className="block text-[11px] font-medium text-muted sm:text-xs">
          {label}
        </span>
      </span>
    </div>
  );
}
