import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: docs } = await supabase
    .from("documents")
    .select("id, slug, title, source_type, status, word_count, last_read_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(8);

  const recent = docs ?? [];
  const name =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Welcome back, {name}.
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Turn any document, video or note into a focused reading experience.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            Upload a document
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            PDF, DOCX, YouTube, or pasted text — no OCR needed for plain text.
          </p>
          <Link
            href="/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Upload className="h-4 w-4" />
            Go to upload
          </Link>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-900">
            A smarter way to read.
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-gray-600">
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
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent uploads</h2>
          <Link
            href="/library"
            className="text-sm text-gray-500 transition hover:text-gray-900"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
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
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {d.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.source_type} · {(d.word_count ?? 0).toLocaleString()} words ·{" "}
                    {d.status}
                  </p>
                </div>
                {d.status === "ready" ? (
                  <Link
                    href={`/c/${d.slug}`}
                    className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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
