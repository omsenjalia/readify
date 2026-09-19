"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <div className="card flex flex-col items-center justify-center border-dashed !border-line-strong py-20 text-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-3xl"
          style={{ background: "var(--color-danger-soft)" }}
        >
          <AlertTriangle className="h-7 w-7 text-danger" strokeWidth={1.75} />
        </span>
        <h2 className="mt-5 text-lg font-bold text-ink">
          Something went wrong
        </h2>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          We couldn&apos;t load your library. This is usually temporary — try
          again.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary btn-md">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link href="/upload" className="btn btn-outline btn-md">
            Go to upload
          </Link>
        </div>
      </div>
    </div>
  );
}
