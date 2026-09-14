"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { looksLikeMarkdown, prepareReadableText } from "@/lib/markdown";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  AlignLeft,
  FileText,
  Loader2,
  Play,
  type LucideIcon,
} from "lucide-react";
import DragDrop from "@/components/DragDrop";
import { createClient } from "@/lib/supabase/client";

type Tab = "document" | "youtube" | "text";
type Phase = "idle" | "uploading" | "processing";

interface PendingDoc {
  id: string;
  slug: string;
  status: "processing" | "ready" | "error";
  progress_msg?: string | null;
  error_msg?: string | null;
}

const TABS: { id: Tab; label: string; icon: LucideIcon; color: string }[] = [
  { id: "document", label: "Document", icon: FileText, color: "text-indigo-600" },
  { id: "youtube", label: "YouTube", icon: Play, color: "text-red-500" },
  { id: "text", label: "Text / Markdown", icon: AlignLeft, color: "text-gray-400" },
];

function extractVideoId(url: string): string | null {
  // Accept the common paste shape: youtube.com/watch?v=ID (no extra & before v=)
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "Untitled document";
}

async function postDocument(body: Record<string, unknown>) {
  return fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function uploadFile(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const path = `${user.id}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export default function UploadPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("document");
  const [phase, setPhase] = useState<Phase>("idle");

  // Document tab
  const [files, setFiles] = useState<File[]>([]);

  // YouTube tab
  const [ytTitle, setYtTitle] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const videoId = extractVideoId(ytUrl);

  // Text tab
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [treatAsMarkdown, setTreatAsMarkdown] = useState(true);
  const wordCount = textContent.trim()
    ? prepareReadableText(textContent, treatAsMarkdown)
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0;

  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const pendingRef = useRef<PendingDoc[]>([]);

  useEffect(() => {
    if (phase !== "processing") return;
    let cancelled = false;

    const tick = async () => {
      const results = await Promise.all(
        pendingRef.current.map(async (doc) => {
          try {
            const res = await fetch(`/api/documents/${doc.id}/status`);
            if (!res.ok) return null;
            const data = await res.json();
            return {
              status: data.status as PendingDoc["status"],
              progress_msg: data.progress_msg,
              error_msg: data.error_msg,
            };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;

      const updated = pendingRef.current.map((doc, i) => {
        const r = results[i];
        return r
          ? { ...doc, status: r.status, progress_msg: r.progress_msg, error_msg: r.error_msg }
          : doc;
      });
      pendingRef.current = updated;
      setPendingDocs(updated);

      const done = updated.every((d) => d.status !== "processing");
      if (!done) return;

      const failed = updated.find((d) => d.status === "error");
      if (failed) {
        toast.error(
          failed.error_msg || "Something went wrong while processing your document.",
        );
        setPhase("idle");
        return;
      }

      router.push(`/c/${updated[updated.length - 1].slug}`);
    };

    const interval = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === "document" && files.length === 0) {
      toast.error("Choose at least one file to upload.");
      return;
    }
    if (tab === "youtube") {
      if (!ytTitle.trim()) {
        toast.error("Give your video a title.");
        return;
      }
      if (!videoId) {
        toast.error("Enter a valid YouTube URL.");
        return;
      }
    }
    if (tab === "text") {
      if (!textTitle.trim()) {
        toast.error("Give your text a title.");
        return;
      }
      if (!textContent.trim()) {
        toast.error("Paste some text to upload.");
        return;
      }
    }

    setPhase("uploading");

    try {
      const created: {
        id: string;
        slug: string;
        status?: "processing" | "ready" | "error";
      }[] = [];

      if (tab === "document") {
        for (const file of files) {
          const ext = file.name.split(".").pop()?.toLowerCase();

          if (ext === "txt" || ext === "md") {
            const res = await postDocument({
              source_type: "txt",
              raw_text: await file.text(),
              title: titleFromFilename(file.name),
              format: ext === "md" ? "markdown" : "text",
            });
            if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
            created.push(await res.json());
            continue;
          }

          if (ext === "epub") {
            throw new Error(
              "EPUB processing isn't supported yet — please convert it to PDF or DOCX.",
            );
          }

          const res = await postDocument({
            source_type: ext === "docx" ? "docx" : "pdf",
            storage_path: await uploadFile(file),
            title: titleFromFilename(file.name),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
          created.push(await res.json());
        }
      } else if (tab === "youtube") {
        const res = await postDocument({
          source_type: "youtube",
          youtube_url: ytUrl.trim(),
          title: ytTitle.trim(),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
        created.push(await res.json());
      } else {
        const asMarkdown =
          treatAsMarkdown || looksLikeMarkdown(textContent);
        const res = await postDocument({
          source_type: "txt",
          raw_text: textContent,
          title: textTitle.trim(),
          format: asMarkdown ? "markdown" : "text",
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
        created.push(await res.json());
      }

      // Plain text is processed inline and returns status: "ready" immediately —
      // no OCR and no processor round-trip.
      const allReady = created.every((c) => c.status === "ready");
      if (allReady) {
        toast.success(
          created.length > 1
            ? `Added ${created.length} documents`
            : "Ready to read",
        );
        router.push(`/c/${created[created.length - 1].slug}`);
        return;
      }

      pendingRef.current = created.map((c) => ({
        ...c,
        status: (c.status as PendingDoc["status"]) || "processing",
      }));
      setPendingDocs(pendingRef.current);
      setPhase("processing");
      toast.success(
        created.length > 1
          ? `Uploaded ${created.length} documents — processing…`
          : "Upload started — processing…",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
      setPhase("idle");
    }
  };

  const progressMsg = pendingDocs
    .map((d) => d.progress_msg)
    .find((m) => m && m.trim().length > 0);
  const doneCount = pendingDocs.filter((d) => d.status !== "processing").length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">
      <h1 className="font-display text-3xl tracking-tight text-[var(--ink)]">
        Add to your library
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Upload a file (PDF, DOCX, TXT, Markdown), paste a YouTube link, or paste text / Markdown.
      </p>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              disabled={phase !== "idle"}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3.5 text-sm transition",
                tab === id
                  ? "border-indigo-600 font-semibold text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600",
                phase !== "idle" && "cursor-not-allowed opacity-60",
              )}
            >
              <Icon className={clsx("h-4 w-4", tab === id ? color : "text-gray-400")} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {phase === "processing" ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                {pendingDocs.length > 1
                  ? `Processing ${doneCount} of ${pendingDocs.length} documents…`
                  : "Processing your document…"}
              </p>
              {progressMsg && (
                <p className="mt-2 text-sm text-[var(--muted)]">{progressMsg}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "document" && (
                <DragDrop onFiles={(next) => setFiles(next)} />
              )}

              {tab === "youtube" && (
                <>
                  <div>
                    <label
                      htmlFor="yt-title"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Title
                    </label>
                    <input
                      id="yt-title"
                      type="text"
                      value={ytTitle}
                      onChange={(e) => setYtTitle(e.target.value)}
                      placeholder="Give your video a title…"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="yt-url"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      YouTube URL
                    </label>
                    <input
                      id="yt-url"
                      type="url"
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      placeholder="Paste a YouTube URL…"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    {videoId && (
                      <p className="mt-1.5 text-xs font-medium text-indigo-600">
                        Video: {videoId}
                      </p>
                    )}
                  </div>
                </>
              )}

              {tab === "text" && (
                <>
                  <div>
                    <label
                      htmlFor="text-title"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Title
                    </label>
                    <input
                      id="text-title"
                      type="text"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder="Give your text a title…"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label
                        htmlFor="text-content"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Content
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={treatAsMarkdown}
                          onChange={(e) => setTreatAsMarkdown(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Treat as Markdown
                      </label>
                    </div>
                    <textarea
                      id="text-content"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Paste plain text or Markdown — headings, lists, **bold**, links, and code fences are cleaned for speed reading…"
                      rows={8}
                      className="min-h-[200px] w-full resize-y rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      {new Intl.NumberFormat().format(wordCount)} words
                      {treatAsMarkdown
                        ? " · Markdown syntax will be stripped"
                        : ""}
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={phase === "uploading"}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phase === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {phase === "uploading"
                  ? "Uploading…"
                  : tab === "document"
                    ? "Upload"
                    : tab === "youtube"
                      ? "Create from video"
                      : "Create document"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}