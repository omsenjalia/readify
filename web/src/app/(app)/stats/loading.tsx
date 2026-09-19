function Bone({ className }: { className: string }) {
  return <span className={`block rounded bg-surface-soft ${className}`} />;
}

export default function StatsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-8 sm:px-6 md:py-12">
      <Bone className="h-8 w-40" />
      <Bone className="mt-2.5 h-4 w-56" />

      {/* Stat cards */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 sm:p-5">
            <Bone className="h-9 w-9 rounded-xl" />
            <Bone className="mt-3.5 h-7 w-16" />
            <Bone className="mt-1.5 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <Bone className="h-4 w-28" />
        <div className="card mt-3 divide-y divide-[var(--color-line)] overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Bone className="h-9 w-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Bone className="h-4 w-40" />
                <Bone className="mt-2 h-3 w-52" />
              </div>
              <Bone className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
