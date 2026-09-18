"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  BookOpen,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import type { DocumentWithProgress } from "@/types";
import { pctComplete } from "@/lib/progress";
import { timeAgo } from "@/lib/format";
import {
  deleteDocument,
  reprocessDocument,
  updateDocument,
} from "@/lib/documents-api";
import { useDocumentStatusPolling } from "@/hooks/useDocumentStatusPolling";
import SourceBadge, { sourceTypeLabel } from "@/components/SourceBadge";
import MenuAction from "@/components/library/MenuAction";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

type TabId = "all" | "documents" | "youtube" | "shared" | "favorites";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "documents", label: "Documents" },
  { id: "youtube", label: "YouTube" },
  { id: "shared", label: "Shared" },
  { id: "favorites", label: "Favorites" },
];

/** Source types that count as a plain "document" in the Documents tab. */
const DOCUMENT_TYPES = ["pdf", "docx", "text", "txt"];

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
  if (doc.status === "error") return { kind: "error", message: doc.error_msg };
  if (total > 0 && wordIndex >= total * 0.95) return { kind: "completed" };
  if (wordIndex > 0 && wordIndex < total) {
    return { kind: "reading", pct: pctComplete(wordIndex, total) };
  }
  return { kind: "ready" };
}

/** Double-click-to-rename delay; kept under the OS double-click threshold. */
const SINGLE_CLICK_MS = 220;

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
      documents: docs.filter((d) => DOCUMENT_TYPES.includes(d.source_type))
        .length,
      youtube: docs.filter((d) => d.source_type === "youtube").length,
      shared: docs.filter((d) => d.visibility === "public").length,
      favorites: docs.filter((d) => d.is_favorite).length,
    }),
    [docs],
  );

  const filtered = useMemo(() => {
    let list = docs;
    if (activeTab === "documents") {
      list = list.filter((d) => DOCUMENT_TYPES.includes(d.source_type));
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

  /* ---------------- processing poller ---------------- */

  const processingIds = useMemo(
    () =>
      docs
        .filter((d) => d.status === "processing")
        .map((d) => d.id)
        .sort(),
    [docs],
  );

  useDocumentStatusPolling(processingIds, (updates) => {
    setDocs((current) =>
      current.map((doc) => {
        const update = updates.find((u) => u.id === doc.id);
        if (!update) return doc;
        return {
          ...doc,
          status: update.status,
          error_msg: update.error_msg,
        };
      }),
    );
  });

  /* ---------------- row actions ---------------- */

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
    setDocs((ds) => ds.map((d) => (d.id === doc.id ? { ...d, title: next } : d)));
    try {
      await updateDocument(doc.id, { title: next });
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
      await updateDocument(doc.id, { is_favorite: next });
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
      await deleteDocument(doc.id);
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
        d.id === doc.id ? { ...d, status: "processing", error_msg: null } : d,
      ),
    );
    try {
      await reprocessDocument(doc.id);
      toast.success("Reprocessing…");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Reprocess failed";
      setDocs((ds) =>
        ds.map((d) =>
          d.id === doc.id ? { ...d, status: "error", error_msg: message } : d,
        ),
      );
      toast.error(message);
    }
  }

  /* ---------------- single vs double click on the title ---------------- */

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
    }, SINGLE_CLICK_MS);
  }

  function handleKeyDown(e: React.KeyboardEvent, doc: DocumentWithProgress) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename(doc);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue(doc.title);
    }
  }

  /* ---------------- render ---------------- */

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
                    <SourceBadge type={doc.source_type} size="sm" />
                    {editingId === doc.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => void commitRename(doc)}
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
                          onClick={() => void toggleFavorite(doc)}
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
                    {sourceTypeLabel(doc.source_type)}
                  </span>
                </td>
                <td className="hidden px-3 py-3.5 text-sm text-[var(--muted)] md:table-cell">
                  {(doc.word_count ?? 0).toLocaleString()}
                </td>
                <td className="hidden px-3 py-3.5 text-sm text-[var(--muted)] md:table-cell">
                  {timeAgo(doc.last_read_at ?? doc.last_session_at)}
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill status={statusOf(doc)} />
                </td>
                <td className="px-6 py-3.5 text-right">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label="Row actions"
                      onClick={() => setMenuId(menuId === doc.id ? null : doc.id)}
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
                              onClick={() => void reprocess(doc)}
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

      {confirmingId && (
        <ConfirmDeleteDialog
          title={docs.find((d) => d.id === confirmingId)?.title}
          deleting={deleting}
          onCancel={() => setConfirmingId(null)}
          onConfirm={() => {
            const doc = docs.find((d) => d.id === confirmingId);
            if (doc) void confirmDelete(doc);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational pieces                                               */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: StatusState }) {
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
          {status.kind === "completed" ? "Completed" : "Ready"}
        </span>
      );
  }
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden="true">
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
