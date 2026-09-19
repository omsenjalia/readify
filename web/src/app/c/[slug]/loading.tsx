import { Loader2 } from "lucide-react";

export default function ReaderLoading() {
  return (
    <div className="glow-radial flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm font-semibold text-muted">Loading document…</p>
    </div>
  );
}
