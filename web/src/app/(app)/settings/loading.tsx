function Bone({ className }: { className: string }) {
  return <span className={`block rounded bg-surface-soft ${className}`} />;
}

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-4 py-8 sm:px-6 md:py-12">
      <Bone className="h-8 w-32" />
      <Bone className="mt-2.5 h-4 w-64" />

      {/* Reading settings card */}
      <div className="card mt-7 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <Bone className="h-4 w-32" />
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <Bone className="h-4 w-32" />
                <Bone className="h-5 w-16 rounded-full" />
              </div>
              <Bone className="mt-3.5 h-1 w-full rounded-full" />
            </div>
          ))}
          <div>
            <Bone className="h-4 w-16" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Bone key={i} className="h-10 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="space-y-3.5 border-t border-line pt-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Bone className="h-4 w-40" />
                <Bone className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account card */}
      <div className="card mt-5 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <Bone className="h-4 w-20" />
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <Bone className="h-10 w-full rounded-xl" />
          <Bone className="h-10 w-44 rounded-full" />
        </div>
      </div>
    </div>
  );
}
