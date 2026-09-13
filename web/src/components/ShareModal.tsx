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
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          Share this reading
        </h2>
        <p className="text-sm text-gray-500">Anyone with this link can view</p>

        {/* Link field */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-2">
          <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
            {shareUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              copied
                ? "bg-emerald-50 text-emerald-600"
                : "bg-white text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50",
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
            "mt-5 rounded-xl border transition-all",
            highlightVisibility
              ? "border-indigo-400 ring-2 ring-indigo-100"
              : "border-transparent",
          )}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Visibility
          </p>
          <div className="space-y-2">
            <label
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                visibility === "private"
                  ? "border-indigo-500"
                  : "border-gray-200 hover:border-gray-300",
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
                    ? "border-indigo-600"
                    : "border-gray-300",
                )}
              >
                {visibility === "private" && (
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Private
                </span>
                <span className="block text-xs text-gray-500">
                  Only you can access.
                </span>
              </span>
            </label>

            <label
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                visibility === "public"
                  ? "border-indigo-500"
                  : "border-gray-200 hover:border-gray-300",
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
                    ? "border-indigo-600"
                    : "border-gray-300",
                )}
              >
                {visibility === "public" && (
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Public
                </span>
                <span className="block text-xs text-gray-500">
                  Anyone with the link can view.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Document preview */}
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate">
            <span className="text-sm font-medium text-gray-900">
              {doc.title}
              <span className="mx-1.5 font-normal text-gray-400">·</span>
              <span className="font-normal text-gray-500">
                {doc.wordCount.toLocaleString()} words
              </span>
              <span className="mx-1.5 font-normal text-gray-400">·</span>
              <span className="font-normal text-gray-500">
                {doc.readMinutes} min
              </span>
            </span>
          </span>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleShareLink}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Share link
        </button>
      </div>
    </div>
  );
}