"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";

export default function ReaderError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Lock className="h-7 w-7 text-gray-500" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Document not found or access denied
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
          This link may be private, deleted, or you don&apos;t have permission
          to view it.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}