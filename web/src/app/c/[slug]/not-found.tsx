import Link from "next/link";
import { BookX } from "lucide-react";

export default function ReaderNotFound() {
  return (
    <div className="glow-radial flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-soft text-muted">
        <BookX className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <div>
        <h2 className="text-lg font-bold text-ink">Document not found</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          This link may be private or the document was deleted.
        </p>
      </div>
      <Link href="/" className="btn btn-primary btn-md">
        Go home
      </Link>
    </div>
  );
}
