const TABS = ["Document", "YouTube", "Text"];

function Bone({ className }: { className: string }) {
  return <span className={`block rounded bg-surface-soft ${className}`} />;
}

export default function UploadLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse px-4 py-8 sm:px-6 md:py-12">
      <Bone className="h-8 w-48" />
      <Bone className="mt-2.5 h-4 w-72" />

      <div className="card mt-6 overflow-hidden">
        {/* Tab bar skeleton */}
        <div className="flex gap-1.5 border-b border-line p-3 sm:p-4">
          {TABS.map((tab) => (
            <Bone key={tab} className="h-10 flex-1 rounded-xl" />
          ))}
        </div>

        {/* Form skeleton */}
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line-strong p-10 text-center">
            <Bone className="h-12 w-12 rounded-2xl" />
            <Bone className="mt-4 h-4 w-56" />
            <Bone className="mt-2 h-3 w-72 max-w-full" />
          </div>
          <Bone className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
