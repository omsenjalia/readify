import Link from "next/link";
import { BookX } from "lucide-react";

export default function ReaderNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <BookX className="h-7 w-7 text-gray-500" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Document not found
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
          This link may be private or the document was deleted.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
      >
        Go home
      </Link>
    </div>
  );
}