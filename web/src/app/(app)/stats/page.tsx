import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BookOpenCheck,
  FileStack,
  Gauge,
  LibraryBig,
  Star,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SourceBadge from "@/components/SourceBadge";
import { timeAgo } from "@/lib/format";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: docRows }, { data: sessionRows }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, source_type, word_count, is_favorite")
      .eq("user_id", user.id),
    supabase
      .from("reading_sessions")
      .select("id, document_id, word_index, wpm, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const docs = docRows ?? [];
  const sessions = sessionRows ?? [];

  const totalDocuments = docs.length;
  const totalWordsRead = sessions.reduce((sum, s) => sum + s.word_index, 0);
  const avgWpm =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / sessions.length)
      : 0;
  const topWpm = sessions.reduce((max, s) => Math.max(max, s.wpm), 0);

  const sessionByDoc = new Map(sessions.map((s) => [s.document_id, s]));
  const completed = docs.filter((doc) => {
    const session = sessionByDoc.get(doc.id);
    return (
      doc.word_count > 0 && (session?.word_index ?? 0) >= doc.word_count * 0.95
    );
  }).length;

  const favourites = docs.filter((d) => d.is_favorite).length;

  const docById = new Map(docs.map((d) => [d.id, d]));
  const recent = sessions
    .slice(0, 6)
    .filter((s) => docById.has(s.document_id))
    .map((s) => ({ doc: docById.get(s.document_id)!, ...s }));

  const statCards = [
    { icon: FileStack, label: "documents", value: totalDocuments.toLocaleString() },
    {
      icon: LibraryBig,
      label: "words read",
      value: totalWordsRead.toLocaleString(),
    },
    { icon: Gauge, label: "avg WPM", value: avgWpm.toLocaleString() },
    { icon: Activity, label: "top WPM", value: topWpm.toLocaleString() },
    {
      icon: BookOpenCheck,
      label: "completed",
      value: completed.toLocaleString(),
    },
    { icon: Star, label: "favourites", value: favourites.toLocaleString() },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Statistics
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your reading activity at a glance.
        </p>
      </header>

      {docs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center border-dashed !border-line-strong py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
            <Upload className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">No stats yet</h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted">
            Upload a document or add a YouTube video to start collecting
            numbers.
          </p>
          <Link href="/upload" className="btn btn-primary btn-md mt-6">
            <Upload className="h-4 w-4" />
            Upload something
          </Link>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {statCards.map((card) => (
              <div key={card.label} className="card p-4 sm:p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <card.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="mt-3.5 text-2xl font-extrabold tracking-tight text-ink tabular-nums sm:text-3xl">
                  {card.value}
                </div>
                <div className="mt-0.5 text-xs font-medium text-muted sm:text-sm">
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-subtle">
              Recent activity
            </h2>
            {recent.length === 0 ? (
              <div className="card px-5 py-10 text-center text-sm text-muted">
                No reading sessions yet. Open a document from your library to
                get started.
              </div>
            ) : (
              <ul className="card divide-y divide-[var(--color-line)] overflow-hidden">
                {recent.map((entry) => {
                  const doc = entry.doc;
                  const pct =
                    doc.word_count > 0
                      ? Math.min(
                          100,
                          Math.round((entry.word_index / doc.word_count) * 100),
                        )
                      : 0;
                  return (
                    <li key={entry.id}>
                      <div className="flex items-center gap-3.5 px-4 py-4 transition hover:bg-surface-soft/50 sm:px-5">
                        <SourceBadge type={doc.source_type} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {doc.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted tabular-nums">
                            {entry.word_index.toLocaleString()} words read at{" "}
                            {entry.wpm} WPM
                          </p>
                          {pct > 0 && pct < 95 && (
                            <div className="mt-2 h-1 w-full max-w-44 overflow-hidden rounded-full bg-surface-soft">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-subtle">
                          {timeAgo(entry.updated_at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
