import { Search, Upload } from "lucide-react";

const ROWS = 6;

const TABS = ["All", "Documents", "YouTube", "Shared", "Favorites"];

export default function LibraryLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 animate-pulse">
      {/* Search & Upload */}
      <div className="flex items-center gap-3">
        <div className="relative w-2/5 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <div className="h-10 w-full rounded-xl border border-gray-200 bg-gray-100" />
        </div>
        <div className="ml-auto flex h-10 w-28 items-center gap-1.5 rounded-xl bg-gray-100">
          <Upload className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => (
          <div key={tab} className="flex items-center gap-2 px-3 py-2.5">
            <span className="h-4 w-10 rounded bg-gray-200" />
            <span className="h-3 w-5 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden grid-cols-5 gap-4 border-b border-gray-200 px-6 py-3 md:grid">
          {["Title", "Type", "Words", "Last read", "Status"].map((col) => (
            <div key={col}>
              <span className="h-3 w-12 rounded bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: ROWS }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3.5 md:grid md:grid-cols-5">
              <div className="flex min-w-0 flex-1 items-center gap-3 md:col-span-1">
                <span className="h-6 w-8 shrink-0 rounded-sm bg-gray-100" />
                <span className="h-4 flex-1 rounded bg-gray-200" />
              </div>
              <span className="hidden h-5 w-14 rounded-full bg-gray-100 md:block" />
              <span className="hidden h-4 w-10 rounded bg-gray-200 md:block" />
              <span className="hidden h-4 w-16 rounded bg-gray-200 md:block" />
              <span className="h-5 w-20 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}