"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  BookOpen,
  FilePenLine,
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
      const message = err instanceof Error ? err.message : "Reprocess failed";
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

  /** Shared dropdown for row/card actions. */
  const actionsMenu = (doc: DocumentWithProgress) =>
    menuId === doc.id && (
      <>
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMenuId(null)}
          aria-hidden="true"
        />
        <div className="popover-in absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-line bg-bg-elevated p-1.5 shadow-[var(--shadow-card)]">
          <MenuAction
            icon={<BookOpen className="h-4 w-4" />}
            label="Read"
            onClick={() => {
              setMenuId(null);
              router.push(`/c/${doc.slug}`);
            }}
          />
          <MenuAction
            icon={<FilePenLine className="h-4 w-4" />}
            label="Edit content"
            onClick={() => {
              setMenuId(null);
              router.push(`/edit/${doc.slug}`);
            }}
          />
          <MenuAction
            icon={<Pencil className="h-4 w-4" />}
            label="Rename"
            onClick={() => startRename(doc)}
          />
          <MenuAction
            icon={<MenuStarIcon doc={doc} />}
            label={doc.is_favorite ? "Unfavorite" : "Favorite"}
            onClick={() => {
              setMenuId(null);
              void toggleFavorite(doc);
            }}
          />
          {doc.status === "error" && (
            <MenuAction
              icon={<RefreshCw className="h-4 w-4" />}
              label="Retry processing"
              onClick={() => void reprocess(doc)}
            />
          )}
          <div className="my-1 border-t border-line" />
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
    );

  const renameInput = (doc: DocumentWithProgress) => (
    <input
      autoFocus
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => void commitRename(doc)}
      onKeyDown={(e) => handleKeyDown(e, doc)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Document title"
      className="input !rounded-lg !py-1.5 text-sm"
    />
  );

  const starButton = (doc: DocumentWithProgress, compact = false) => (
    <button
      type="button"
      aria-label={doc.is_favorite ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.stopPropagation();
        void toggleFavorite(doc);
      }}
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-lg transition",
        compact ? "h-10 w-10" : "h-11 w-11 md:h-auto md:w-auto md:p-1.5",
        doc.is_favorite
          ? "text-amber-400"
          : "text-subtle hover:text-amber-400 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100",
      )}
    >
      <Star className={clsx("h-4 w-4", doc.is_favorite && "fill-current")} />
    </button>
  );

  const menuButton = (doc: DocumentWithProgress) => (
    <button
      type="button"
      aria-label="Row actions"
      aria-expanded={menuId === doc.id}
      onClick={() => setMenuId(menuId === doc.id ? null : doc.id)}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-ink md:h-auto md:w-auto md:p-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
    >
      <MoreHorizontal className="h-4.5 w-4.5" />
    </button>
  );

  /* ---------------- render ---------------- */

  if (docs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="card flex flex-col items-center justify-center border-dashed !border-line-strong py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
            <Upload className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">
            Your library is empty
          </h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted">
            Upload a document, paste some text, or add a YouTube video to get
            flowing.
          </p>
          <Link href="/upload" className="btn btn-primary btn-md mt-6">
            <Upload className="h-4 w-4" />
            Upload something
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Library
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Everything you&apos;ve uploaded, ready to flow.
        </p>
      </header>

      {/* Search & Upload */}
      <div className="flex items-center gap-2.5">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            aria-label="Search documents"
            className="input !rounded-full !pl-10"
          />
        </div>
        <Link href="/upload" className="btn btn-primary btn-md ml-auto shrink-0">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Filter tabs — horizontally scrollable on phones */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition",
              activeTab === tab.id
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-line bg-surface/50 text-muted hover:text-ink",
            )}
          >
            {tab.label}
            <span
              className={clsx(
                "ml-1.5 text-xs tabular-nums",
                activeTab === tab.id ? "text-accent/70" : "text-subtle",
              )}
            >
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card mt-5 hidden overflow-hidden md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
              <th className="px-5 py-3">Title</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Words</th>
              <th className="px-3 py-3">Last read</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr
                key={doc.id}
                className="group border-b border-line/60 transition last:border-0 hover:bg-surface-soft/60"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <SourceBadge type={doc.source_type} size="sm" />
                    {editingId === doc.id ? (
                      renameInput(doc)
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTitleClick(doc)}
                          className="block min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink transition hover:text-accent"
                          title={`${doc.title} — click to read, double-click to rename`}
                        >
                          {doc.title}
                        </button>
                        {starButton(doc)}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <span className="pill !px-2.5 !py-1 !text-[11px]">
                    {sourceTypeLabel(doc.source_type)}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-sm text-muted tabular-nums">
                  {(doc.word_count ?? 0).toLocaleString()}
                </td>
                <td className="px-3 py-3.5 text-sm text-muted">
                  {timeAgo(doc.last_read_at ?? doc.last_session_at)}
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill status={statusOf(doc)} />
                </td>
                <td className="relative px-5 py-3.5 text-right">
                  {menuButton(doc)}
                  {actionsMenu(doc)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted">
            No documents match your search.
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <ul className="mt-4 grid gap-2.5 md:hidden">
        {filtered.map((doc) => {
          const status = statusOf(doc);
          return (
            <li key={doc.id} className="card relative p-4">
              <div className="flex items-start gap-3">
                <SourceBadge type={doc.source_type} size="md" />
                <div className="min-w-0 flex-1">
                  {editingId === doc.id ? (
                    renameInput(doc)
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push(`/c/${doc.slug}`)}
                      className="block w-full truncate text-left text-[15px] font-bold text-ink"
                    >
                      {doc.title}
                    </button>
                  )}
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    {(doc.word_count ?? 0).toLocaleString()} words ·{" "}
                    {timeAgo(doc.last_read_at ?? doc.last_session_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-2">
                <StatusPill status={status} />
                <div className="relative flex items-center">
                  {starButton(doc, true)}
                  {menuButton(doc)}
                  {actionsMenu(doc)}
                </div>
              </div>

              {status.kind === "reading" && (
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${status.pct}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="card py-14 text-center text-sm text-muted">
            No documents match your search.
          </li>
        )}
      </ul>

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

/** Star-in-menu icon (the label carries the meaning). */
function MenuStarIcon({ doc }: { doc: DocumentWithProgress }) {
  return (
    <Star className={clsx("h-4 w-4", doc.is_favorite && "fill-current")} />
  );
}

/* ------------------------------------------------------------------ */
/* Presentational pieces                                               */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: StatusState }) {
  switch (status.kind) {
    case "processing":
      return (
        <span className="pill !text-[11px]">
          <Loader2 className="h-3 w-3 animate-spin text-accent" />
          Processing
        </span>
      );
    case "error":
      return (
        <span
          title={status.message || "Processing failed"}
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
          }}
        >
          Error
        </span>
      );
    case "reading":
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
          <span className="h-1 w-12 overflow-hidden rounded-full bg-accent/25">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${status.pct}%` }}
            />
          </span>
          <span className="tabular-nums">{status.pct}%</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
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
