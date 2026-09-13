import { Loader2 } from "lucide-react";

export default function ReaderLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-gray-600">
        Loading document…
      </p>
    </div>
  );
}