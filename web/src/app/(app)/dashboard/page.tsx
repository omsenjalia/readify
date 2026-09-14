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

function typeBadge(source: string) {
  const s = (source || "").toLowerCase();
  if (s === "pdf")
    return (
      <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        PDF
      </span>
    );
  if (s === "docx")
    return (
      <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
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
    .limit(6);

  const recent = docs ?? [];
  const resume = recent.find((d) => d.status === "ready") ?? null;
  const name =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8 md:py-10">
      {/* Welcome — matches concept “Welcome back, Alex.” */}
      <header className="mb-8">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink md:text-4xl">
          Welcome back, {name}.
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-muted">
          Turn any document, video or note into a focused reading experience.
        </p>
      </header>

      {/* Upload strip + illustration */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="card overflow-hidden">
          <div className="flex border-b border-line text-sm">
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
                    ? "relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3.5 font-semibold text-ink after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orp"
                    : "flex flex-1 items-center justify-center gap-1.5 px-2 py-3.5 text-muted transition hover:text-ink"
                }
              >
                <tab.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tab.label}
              </Link>
            ))}
          </div>
          <Link
            href="/upload"
            className="mx-5 my-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-bg/50 px-4 py-12 text-center transition hover:border-muted hover:bg-bg"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efeae1] text-muted">
              <Upload className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Drop your file here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted">
              Supported formats: PDF, DOCX, TXT, EPUB (Max 50MB)
            </p>
          </Link>
        </div>

        {/* Side card — concept “A smarter way to read.” */}
        <div className="card relative flex flex-col justify-between overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rotate-12 rounded-xl bg-gradient-to-br from-indigo-100/80 to-transparent" />
          <p className="font-display relative text-2xl leading-snug text-ink">
            A smarter
            <br />
            way to read.
          </p>
          <ul className="relative mt-6 space-y-2.5 text-sm text-muted">
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
        </div>
      </div>

      {/* Recent uploads */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Recent uploads
          </h2>
          <Link
            href="/library"
            className="text-sm font-medium text-orp hover:underline"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="card border-dashed py-14 text-center text-sm text-muted">
            Nothing yet —{" "}
            <Link href="/upload" className="font-semibold text-orp">
              upload something
            </Link>
            .
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((d) => (
              <li
                key={d.id}
                className="card flex items-center gap-3 px-4 py-3.5"
              >
                <div className="shrink-0">{typeBadge(d.source_type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {d.title}
                  </p>
                  <p className="text-xs text-muted">
                    {(d.word_count ?? 0).toLocaleString()} words
                    {d.word_count ? " · " : ""}
                    {d.source_type}
                  </p>
                </div>
                {d.status === "ready" ? (
                  <>
                    <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline">
                      Ready
                    </span>
                    <Link
                      href={`/c/${d.slug}`}
                      className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-[#efeae1]"
                    >
                      Read
                    </Link>
                  </>
                ) : d.status === "error" ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                    Error
                  </span>
                ) : (
                  <span className="text-xs font-medium text-orp">
                    Processing…
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Continue reading */}
      {resume && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Continue reading
          </h2>
          <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink">
                {resume.title}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {(resume.word_count ?? 0).toLocaleString()} words ·{" "}
                {resume.source_type}
              </p>
            </div>
            <Link
              href={`/c/${resume.slug}`}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink-inv transition hover:opacity-90"
            >
              Continue reading →
            </Link>
          </div>
        </section>
      )}

      {/* Quote */}
      <p className="font-display mt-12 text-center text-xl italic text-ink/80 md:text-2xl">
        &ldquo;A calmer mind for a deeper you.&rdquo;
      </p>
    </div>
  );
}
