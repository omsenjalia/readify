"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";

export default function ReaderError({
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
    <div className="glow-radial flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-soft text-muted">
        <Lock className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <div>
        <h2 className="text-lg font-bold text-ink">
          Document not found or access denied
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          This link may be private, deleted, or you don&apos;t have permission
          to view it.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary btn-md">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link href="/" className="btn btn-outline btn-md">
          Go home
        </Link>
      </div>
    </div>
  );
}
