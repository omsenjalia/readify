const TABS = ["Document", "YouTube", "Text"];

export default function UploadLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 animate-pulse">
      <h1 className="h-7 w-48 rounded bg-gray-200 text-2xl font-bold tracking-tight text-gray-900" />
      <p className="mt-2 h-4 w-72 rounded bg-gray-100" />

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Tab bar skeleton */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <div key={tab} className="flex flex-1 items-center justify-center gap-2 px-3 py-3.5">
              <span className="h-4 w-4 rounded bg-gray-100" />
              <span className="h-3.5 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
            <span className="h-10 w-10 rounded-full bg-gray-100" />
            <span className="mt-3 h-4 w-56 rounded bg-gray-200" />
            <span className="mt-2 h-3 w-72 rounded bg-gray-100" />
          </div>
          <div className="h-10 w-full rounded-xl border border-gray-100 bg-gray-50" />
          <div className="h-24 w-full rounded-xl border border-gray-100 bg-gray-50" />
          <div className="h-11 w-full rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}