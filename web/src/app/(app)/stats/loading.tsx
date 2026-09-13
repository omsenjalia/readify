const CARDS = [
  { label: "documents", width: "w-16" },
  { label: "words read", width: "w-24" },
  { label: "avg WPM", width: "w-14" },
  { label: "completed", width: "w-20" },
];

export default function StatsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 animate-pulse">
      <h1 className="h-7 w-40 rounded bg-gray-200 text-2xl font-bold tracking-tight text-gray-900" />
      <p className="mt-2 h-4 w-56 rounded bg-gray-100" />

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100" />
            <span className={`mt-3 block h-7 rounded ${card.width} bg-gray-200`} />
            <span className="mt-1 block h-3 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <span className="block h-4 w-28 rounded bg-gray-200" />
        <div className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <span className="h-8 w-8 shrink-0 rounded-full bg-gray-100" />
              <div className="min-w-0 flex-1">
                <span className="block h-4 w-40 rounded bg-gray-200" />
                <span className="mt-2 block h-3 w-52 rounded bg-gray-100" />
              </div>
              <span className="h-3 w-12 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}