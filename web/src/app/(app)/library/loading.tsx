const ROWS = 6;

const TABS = ["All", "Documents", "YouTube", "Shared", "Favorites"];

/** Shared skeleton primitives — token-coloured so they work in every theme. */
function Bone({ className }: { className: string }) {
  return <span className={`block rounded bg-surface-soft ${className}`} />;
}

export default function LibraryLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-8 sm:px-6 md:py-10">
      <Bone className="h-8 w-40" />
      <Bone className="mt-2.5 h-4 w-64" />

      {/* Search & Upload */}
      <div className="mt-6 flex items-center gap-2.5">
        <Bone className="h-10 w-full max-w-xs rounded-full" />
        <Bone className="ml-auto h-10 w-24 rounded-full" />
      </div>

      {/* Filter tabs */}
      <div className="mt-5 flex gap-1.5 overflow-hidden">
        {TABS.map((tab, i) => (
          <Bone
            key={tab}
            className={`h-9 rounded-full ${i === 0 ? "w-20" : "w-24"}`}
          />
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="card mt-5 hidden overflow-hidden md:block">
        <div className="border-b border-line px-5 py-3">
          <Bone className="h-3 w-full max-w-md" />
        </div>
        {Array.from({ length: ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-line/60 px-5 py-4 last:border-0"
          >
            <Bone className="h-6 w-9 shrink-0 rounded-lg" />
            <Bone className="h-4 flex-1 max-w-64" />
            <Bone className="hidden h-5 w-14 rounded-full md:block" />
            <Bone className="hidden h-4 w-12 md:block" />
            <Bone className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>

      {/* Mobile card skeleton */}
      <div className="mt-4 grid gap-2.5 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start gap-3">
              <Bone className="h-7 w-10 shrink-0 rounded-lg" />
              <div className="flex-1">
                <Bone className="h-4 w-3/4" />
                <Bone className="mt-2 h-3 w-1/2" />
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between">
              <Bone className="h-5 w-20 rounded-full" />
              <Bone className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
