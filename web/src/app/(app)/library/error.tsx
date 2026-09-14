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
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          Something went wrong
        </h2>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          We couldn&apos;t load your library. This is usually temporary — try
          again.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Go to upload
          </Link>
        </div>
      </div>
    </div>
  );
}