"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  AlignLeft,
  BookOpen,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Search,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import type { DocumentWithProgress } from "@/types";
import { pctComplete } from "@/lib/progress";

type TabId = "all" | "documents" | "youtube" | "shared" | "favorites";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "documents", label: "Documents" },
  { id: "youtube", label: "YouTube" },
  { id: "shared", label: "Shared" },
  { id: "favorites", label: "Favorites" },
];

const DOC_TYPES = ["pdf", "docx", "text", "txt"];

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  youtube: "YouTube",
  text: "Text",
  txt: "Text",
  image: "Text",
};

type StatusState =
  | { kind: "processing" }
  | { kind: "error"; message?: string | null }
  | { kind: "completed" }
  | { kind: "reading"; pct: number }
  | { kind: "ready" };

function statusOf(doc: DocumentWithProgress): StatusState {
  const wordIndex = doc.word_index ?? 0;
  const total = doc.word_count ?? 0;
  if (doc.status === "processing") return { kind: "processing" };
  if (doc.status === "error")
    return { kind: "error", message: doc.error_msg };
  if (total > 0 && wordIndex >= total * 0.95) return { kind: "completed" };
  if (wordIndex > 0 && wordIndex < total) {
    return { kind: "reading", pct: pctComplete(wordIndex, total) };
  }
  return { kind: "ready" };
}

function statusPill(status: StatusState) {
  switch (status.kind) {
    case "processing":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case "error":
      return (
        <span
          title={status.message || "Processing failed"}
          className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600"
        >
          Error
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          <CheckMark />
          Completed
        </span>
      );
    case "reading":
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          <span className="h-1 w-14 overflow-hidden rounded-full bg-indigo-200">
            <span
              className="block h-full rounded-full bg-indigo-600"
              style={{ width: `${status.pct}%` }}
            />
          </span>
          {status.pct}%
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          <CheckMark />
          Ready
        </span>
      );
  }
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path
        d="M5 10.5 8.5 14 15 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SourceBadge({ type }: { type: string }) {
  if (type === "pdf") {
    return (
      <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-sm bg-red-600 text-[10px] font-bold tracking-wide text-white">
        PDF
      </span>
    );
  }
  if (type === "docx") {
    return (
      <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded-sm bg-blue-600 text-[10px] font-bold tracking-wide text-white">
        DOCX
      </span>
    );
  }
  if (type === "youtube") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
        <Play className="h-3.5 w-3.5 fill-current" />
      </span>
    );
  }
  return <AlignLeft className="h-4 w-4 shrink-0 text-[var(--muted)]" />;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "–";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "–";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default function LibraryTable({
  documents,
}: {
  documents: DocumentWithProgress[];
}) {
  const router = useRouter();

  const [docs, setDocs] = useState(documents);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  const counts = useMemo(
    () => ({
      all: docs.length,
      documents: docs.filter((d) => DOC_TYPES.includes(d.source_type)).length,
      youtube: docs.filter((d) => d.source_type === "youtube").length,
      shared: docs.filter((d) => d.visibility === "public").length,
      favorites: docs.filter((d) => d.is_favorite).length,
    }),
    [docs],
  );

  const filtered = useMemo(() => {
    let list = docs;
    if (activeTab === "documents") {
      list = list.filter((d) => DOC_TYPES.includes(d.source_type));
    } else if (activeTab === "youtube") {
      list = list.filter((d) => d.source_type === "youtube");
    } else if (activeTab === "shared") {
      list = list.filter((d) => d.visibility === "public");
    } else if (activeTab === "favorites") {
      list = list.filter((d) => d.is_favorite);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.source_type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [docs, activeTab, query]);

  function startRename(doc: DocumentWithProgress) {
    setMenuId(null);
    setEditingId(doc.id);
    setEditValue(doc.title);
  }

  async function commitRename(doc: DocumentWithProgress) {
    const next = editValue.trim();
    setEditingId(null);
    if (!next || next === doc.title) return;
    const prevTitle = doc.title;
    setDocs((ds) =>
      ds.map((d) => (d.id === doc.id ? { ...d, title: next } : d)),
    );
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) throw new Error("rename failed");
      toast.success(`Renamed to “${next}”`);
    } catch {
      setDocs((ds) =>
        ds.map((d) => (d.id === doc.id ? { ...d, title: prevTitle } : d)),
      );
      toast.error("Couldn't rename document");
    }
  }

  async function toggleFavorite(doc: DocumentWithProgress) {
    const next = !doc.is_favorite;
    setDocs((ds) =>
      ds.map((d) => (d.id === doc.id ? { ...d, is_favorite: next } : d)),
    );
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: next }),
      });
      if (!res.ok) throw new Error("favorite failed");
      toast.success(next ? "Added to Favorites" : "Removed from Favorites");
    } catch {
      setDocs((ds) =>
        ds.map((d) => (d.id === doc.id ? { ...d, is_favorite: !next } : d)),
      );
      toast.error("Couldn't update favorite");
    }
  }

  async function confirmDelete(doc: DocumentWithProgress) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setDocs((ds) => ds.filter((d) => d.id !== doc.id));
      setConfirmingId(null);
      toast.success("Document deleted");
    } catch {
      toast.error("Couldn't delete document");
    } finally {
      setDeleting(false);
    }
  }

  async function reprocess(doc: DocumentWithProgress) {
    setMenuId(null);
    setDocs((ds) =>
      ds.map((d) =>
        d.id === doc.id
          ? { ...d, status: "processing", error_msg: null }
          : d,
      ),
    );
    try {
      const res = await fetch(`/api/documents/${doc.id}/reprocess`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Reprocess failed");
      }
      toast.success("Reprocessing…");
    } catch (err) {
      setDocs((ds) =>
        ds.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "error",
                error_msg:
                  err instanceof Error ? err.message : "Reprocess failed",
              }
            : d,
        ),
      );
      toast.error(err instanceof Error ? err.message : "Reprocess failed");
    }
  }

  
  const processingIds = useMemo(
    () =>
      docs
        .filter((d) => d.status === "processing")
        .map((d) => d.id)
        .sort()
        .join(","),
    [docs],
  );

  // Poll status for any docs stuck in processing (upload or retry).
  useEffect(() => {
    if (!processingIds) return;
    const ids = processingIds.split(",");

    let cancelled = false;
    const tick = async () => {
      const updates = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/documents/${id}/status`);
            if (!res.ok) return null;
            const data = await res.json();
            return {
              id,
              status: data.status as string,
              error_msg: data.error_msg as string | null,
            };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setDocs((ds) =>
        ds.map((d) => {
          const u = updates.find((x) => x && x.id === d.id);
          if (!u) return d;
          return {
            ...d,
            status: u.status as DocumentWithProgress["status"],
            error_msg: u.error_msg,
          };
        }),
      );
    };

    tick();
    const timer = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [processingIds]);

  function handleTitleClick(doc: DocumentWithProgress) {
    if (editingId === doc.id) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      startRename(doc);
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      router.push(`/c/${doc.slug}`);
    }, 220);
  }

  function handleKeyDown(
    e: React.KeyboardEvent,
    doc: DocumentWithProgress,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename(doc);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue(doc.title);
    }
  }

  if (docs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <Upload className="h-7 w-7 text-indigo-600" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-[var(--ink)]">
            Your library is empty
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Upload a document or add a YouTube video to get started.
          </p>
          <Link
            href="/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            Upload something
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Search & Upload */}
      <div className="flex items-center gap-3">
        <div className="relative w-2/5 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your documents…"
            className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <Link
          href="/upload"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-[var(--line)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm transition",
              activeTab === tab.id
                ? "border-indigo-600 font-semibold text-[var(--ink)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--muted)]",
            )}
          >
            {tab.label}
            <span className="ml-1 text-xs text-[var(--muted)]">
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
        <table className="w-full text-left md:min-w-[720px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              <th className="px-6 py-3">Title</th>
              <th className="hidden px-3 py-3 md:table-cell">Type</th>
              <th className="hidden px-3 py-3 md:table-cell">Words</th>
              <th className="hidden px-3 py-3 md:table-cell">Last read</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((doc) => (
              <tr key={doc.id} className="group hover:bg-[var(--surface-soft)]/70">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <SourceBadge type={doc.source_type} />
                    {editingId === doc.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitRename(doc)}
                        onKeyDown={(e) => handleKeyDown(e, doc)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-lg border border-indigo-300 px-2 py-1 text-sm text-[var(--ink)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTitleClick(doc)}
                          className="block min-w-0 flex-1 truncate text-left text-sm font-medium text-[var(--ink)] transition hover:text-indigo-600"
                          title={doc.title}
                        >
                          {doc.title}
                        </button>
                        <button
                          type="button"
                          aria-label={
                            doc.is_favorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          onClick={() => toggleFavorite(doc)}
                          className={clsx(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition",
                            doc.is_favorite
                              ? "text-amber-400"
                              : "text-gray-300 opacity-100 hover:text-amber-400 focus:opacity-100 md:h-auto md:w-auto md:p-1 md:opacity-0 md:group-hover:opacity-100",
                          )}
                        >
                          <Star
                            className={clsx(
                              "h-4 w-4",
                              doc.is_favorite && "fill-current",
                            )}
                          />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                <td className="hidden px-3 py-3.5 md:table-cell">
                  <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                    {TYPE_LABELS[doc.source_type] ?? "Text"}
                  </span>
                </td>
                <td className="hidden px-3 py-3.5 text-sm text-[var(--muted)] md:table-cell">
                  {(doc.word_count ?? 0).toLocaleString()}
                </td>
                <td className="hidden px-3 py-3.5 text-sm text-[var(--muted)] md:table-cell">
                  {timeAgo(doc.last_read_at ?? doc.last_session_at)}
                </td>
                <td className="px-3 py-3.5">{statusPill(statusOf(doc))}</td>
                <td className="px-6 py-3.5 text-right">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label="Row actions"
                      onClick={() =>
                        setMenuId(menuId === doc.id ? null : doc.id)
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--muted)] opacity-100 transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] focus:opacity-100 md:h-auto md:w-auto md:p-1.5 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuId === doc.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuId(null)}
                        />
                        <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1.5 shadow-lg">
                          <MenuAction
                            icon={<BookOpen className="h-4 w-4" />}
                            label="Read"
                            onClick={() => {
                              setMenuId(null);
                              router.push(`/c/${doc.slug}`);
                            }}
                          />
                          <MenuAction
                            icon={<Pencil className="h-4 w-4" />}
                            label="Rename"
                            onClick={() => startRename(doc)}
                          />
                          {doc.status === "error" && (
                            <MenuAction
                              icon={<RefreshCw className="h-4 w-4" />}
                              label="Retry processing"
                              onClick={() => reprocess(doc)}
                            />
                          )}
                          <div className="my-1 border-t border-[var(--line)]" />
                          <MenuAction
                            icon={<Trash2 className="h-4 w-4" />}
                            label="Delete"
                            danger
                            onClick={() => {
                              setMenuId(null);
                              setConfirmingId(doc.id);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-[var(--muted)]">
            No documents match your search.
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmingId(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-[var(--ink)]">
              Delete document?
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Delete this document? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const doc = docs.find((d) => d.id === confirmingId);
                  if (doc) confirmDelete(doc);
                }}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}