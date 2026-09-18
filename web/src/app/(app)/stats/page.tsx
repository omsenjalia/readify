import { redirect } from "next/navigation";
import Link from "next/link";
import { Upload } from "lucide-react";
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

  const [
    { data: docRows },
    { data: sessionRows },
  ] = await Promise.all([
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
    .slice(0, 5)
    .filter((s) => docById.has(s.document_id))
    .map((s) => ({ doc: docById.get(s.document_id)!, ...s }));

  const statCards = [
    { icon: "📄", label: "documents", value: totalDocuments.toLocaleString() },
    {
      icon: "📖",
      label: "words read",
      value: totalWordsRead.toLocaleString(),
    },
    { icon: "⚡", label: "avg WPM", value: avgWpm.toLocaleString() },
    { icon: "✅", label: "completed", value: completed.toLocaleString() },
    { icon: "⭐", label: "favourites", value: favourites.toLocaleString() },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Statistics
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Your reading activity at a glance.
      </p>

      {docs.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <Upload className="h-7 w-7 text-indigo-600" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No stats yet
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload a document or add a YouTube video to start reading.
          </p>
          <Link
            href="/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            Upload something
          </Link>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="text-xl leading-none">{card.icon}</div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                  {card.value}
                </div>
                <div className="mt-0.5 text-sm text-gray-500">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent activity
            </h2>
            {recent.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500 shadow-sm">
                No reading sessions yet. Open a document in your library to get
                started.
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
                {recent.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <SourceBadge type={entry.doc.source_type} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {entry.doc.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {entry.word_index.toLocaleString()} words read at{" "}
                        {entry.wpm} WPM
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {timeAgo(entry.updated_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}