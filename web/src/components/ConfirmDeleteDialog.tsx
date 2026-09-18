"use client";

/**
 * Destructive-action confirmation.
 *
 * The library table and the reader each had their own copy with different
 * copy and only one of them wired up `aria-modal`.
 */
export default function ConfirmDeleteDialog({
  title,
  deleting = false,
  onCancel,
  onConfirm,
}: {
  /** Document title, when known. Omitted while the row is still loading. */
  title?: string | null;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm delete"
        className="relative w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-[var(--ink)]">
          Delete document?
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {title ? `“${title}” will be` : "This document will be"} permanently
          removed. Shared links will stop working.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-soft)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
