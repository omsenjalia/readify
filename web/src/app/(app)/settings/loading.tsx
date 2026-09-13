export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 animate-pulse">
      <h1 className="h-7 w-32 rounded bg-gray-200 text-2xl font-bold tracking-tight text-gray-900" />
      <p className="mt-2 h-4 w-64 rounded bg-gray-100" />

      {/* Reading settings card */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <span className="block h-4 w-32 rounded bg-gray-200" />
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <span className="block h-4 w-32 rounded bg-gray-200" />
                <span className="block h-4 w-12 rounded bg-gray-100" />
              </div>
              <div className="mt-3 h-3 w-full rounded-full bg-gray-100" />
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="block h-4 w-24 rounded bg-gray-200" />
            <span className="h-5 w-9 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>

      {/* Account card */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <span className="block h-4 w-16 rounded bg-gray-200" />
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="h-10 w-full rounded-xl bg-gray-50" />
          <div className="h-10 w-44 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}