"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Check, Copy, FileText, X } from "lucide-react";
import {
  copyToClipboard,
  updateDocumentVisibility,
  type Visibility,
} from "@/lib/share";

export interface ReaderShareDoc {
  id: string;
  slug: string;
  title: string;
  visibility: Visibility;
  wordCount: number;
  readMinutes: number;
}

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  doc: ReaderShareDoc;
  initialSection?: "link" | "visibility";
  onVisibilityChange?: (visibility: Visibility) => void;
}

export default function ShareModal({
  open,
  onClose,
  doc,
  initialSection = "link",
  onVisibilityChange,
}: ShareModalProps) {
  if (!open) return null;
  return (
    <ShareModalContent
      onClose={onClose}
      doc={doc}
      initialSection={initialSection}
      onVisibilityChange={onVisibilityChange}
    />
  );
}

function ShareModalContent({
  onClose,
  doc,
  initialSection,
  onVisibilityChange,
}: {
  onClose: () => void;
  doc: ReaderShareDoc;
  initialSection: "link" | "visibility";
  onVisibilityChange?: (visibility: Visibility) => void;
}) {
  const [visibility, setVisibility] = useState<Visibility>(doc.visibility);
  const [copied, setCopied] = useState(false);
  const [highlightVisibility, setHighlightVisibility] = useState(
    initialSection === "visibility",
  );
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const shareUrl = `${window.location.origin}/c/${doc.slug}`;

  useEffect(() => {
    const t = setTimeout(() => setHighlightVisibility(false), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const ref = timers.current;
    return () => ref.forEach(clearTimeout);
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      schedule(() => setCopied(false), 2000);
    }
    return ok;
  };

  const handleVisibilityChange = async (next: Visibility) => {
    const prev = visibility;
    setVisibility(next);
    onVisibilityChange?.(next);
    const ok = await updateDocumentVisibility(doc.id, next);
    if (ok) {
      toast.success(
        next === "public" ? "Link is now public" : "Link is now private",
      );
    } else {
      setVisibility(prev);
      onVisibilityChange?.(prev);
      toast.error("Couldn't update visibility — try again.");
    }
  };

  const handleShareLink = async () => {
    if (visibility !== "public") {
      setVisibility("public");
      onVisibilityChange?.("public");
      const ok = await updateDocumentVisibility(doc.id, "public");
      if (!ok) {
        setVisibility("private");
        onVisibilityChange?.("private");
        toast.error("Couldn't make the link public — try again.");
        return;
      }
    }
    const ok = await handleCopy();
    toast(ok ? "Link copied to clipboard" : "Couldn't copy the link.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share this reading"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="sheet-in relative w-full max-w-md rounded-t-3xl border border-line bg-bg-elevated p-6 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share dialog"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-muted transition hover:text-ink"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <h2 className="text-lg font-extrabold tracking-tight text-ink">
          Share this reading
        </h2>
        <p className="mt-0.5 text-sm text-muted">Anyone with this link can view</p>

        {/* Link field */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-surface-soft/60 py-2 pl-3.5 pr-2">
          <span className="min-w-0 flex-1 truncate text-sm text-muted">
            {shareUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition",
              copied
                ? "bg-accent-soft text-accent"
                : "bg-surface text-ink ring-1 ring-line hover:ring-line-strong",
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Visibility */}
        <div
          className={clsx(
            "mt-5 rounded-2xl border transition-all",
            highlightVisibility
              ? "border-accent/60 ring-2 ring-accent/20"
              : "border-transparent",
          )}
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-subtle">
            Visibility
          </p>
          <div className="space-y-2">
            <label
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition",
                visibility === "private"
                  ? "border-accent/60 bg-accent-soft/50"
                  : "border-line hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility === "private"}
                onChange={() => handleVisibilityChange("private")}
                className="sr-only"
              />
              <span
                className={clsx(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  visibility === "private"
                    ? "border-accent"
                    : "border-line-strong",
                )}
              >
                {visibility === "private" && (
                  <span className="h-2 w-2 rounded-full bg-accent" />
                )}
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">
                  Private
                </span>
                <span className="block text-xs text-muted">
                  Only you can access.
                </span>
              </span>
            </label>

            <label
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition",
                visibility === "public"
                  ? "border-accent/60 bg-accent-soft/50"
                  : "border-line hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility === "public"}
                onChange={() => handleVisibilityChange("public")}
                className="sr-only"
              />
              <span
                className={clsx(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  visibility === "public"
                    ? "border-accent"
                    : "border-line-strong",
                )}
              >
                {visibility === "public" && (
                  <span className="h-2 w-2 rounded-full bg-accent" />
                )}
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">
                  Public
                </span>
                <span className="block text-xs text-muted">
                  Anyone with the link can view.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Document preview */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface-soft/60 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate">
            <span className="text-sm font-semibold text-ink">
              {doc.title}
              <span className="mx-1.5 font-normal text-subtle">·</span>
              <span className="font-normal text-muted">
                {doc.wordCount.toLocaleString()} words
              </span>
              <span className="mx-1.5 font-normal text-subtle">·</span>
              <span className="font-normal text-muted">
                {doc.readMinutes} min
              </span>
            </span>
          </span>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleShareLink}
          className="btn btn-primary btn-lg mt-5 w-full"
        >
          Share link
        </button>
      </div>
    </div>
  );
}