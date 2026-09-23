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
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm delete"
        className="popover-in relative w-full max-w-sm rounded-3xl border border-line bg-bg-elevated p-6 shadow-2xl"
      >
        <h3 className="text-base font-extrabold text-ink">
          Delete document?
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {title ? `“${title}” will be` : "This document will be"} permanently
          removed. Shared links will stop working.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost btn-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="btn btn-md !bg-[var(--color-danger)] !text-white !shadow-none hover:!opacity-90 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
