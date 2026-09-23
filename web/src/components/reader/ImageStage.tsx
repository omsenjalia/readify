"use client";

/**
 * A figure from the document.
 *
 * Images come from a private bucket as short-lived signed URLs, generated
 * server-side per request. `next/image` optimisation is deliberately not used:
 * it would require the Supabase host in `images.remotePatterns`, and every
 * navigation would re-fetch and re-encode a URL that already expires.
 */
export default function ImageStage({
  url,
  children,
}: {
  url: string;
  /** Dwell overlay, rendered beneath the figure. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center px-1">
      <div className="card w-full overflow-hidden p-2.5 sm:p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Document figure"
          loading="lazy"
          decoding="async"
          className="max-h-[min(62vh,28rem)] w-full rounded-xl object-contain"
        />
      </div>
      {children}
    </div>
  );
}
