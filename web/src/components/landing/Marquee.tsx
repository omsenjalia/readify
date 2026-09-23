const ITEMS = [
  "PDF",
  "DOCX",
  "YouTube",
  "Markdown",
  "Plain text",
  "Scanned OCR",
  "हिन्दी",
  "ગુજરાતી",
];

/**
 * Endless source-format ticker — the "trusted by" band, but for inputs
 * instead of logos. Duplicated track + translateX(-50%) loop; pauses on
 * hover, stops entirely under reduced motion.
 */
export default function Marquee() {
  const halfTrack = (ariaHidden: boolean) => (
    <div
      className="flex shrink-0 items-center gap-6 pr-6"
      aria-hidden={ariaHidden || undefined}
    >
      {ITEMS.map((label) => (
        <span
          key={label}
          className="mono flex items-center gap-6 whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.22em] text-subtle"
        >
          {label}
          <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee-paused relative w-full overflow-hidden border-y border-line py-5">
      <div className="animate-marquee flex w-max items-center">
        {halfTrack(false)}
        {halfTrack(true)}
      </div>
      {/* edge fades */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-24"
        style={{
          background: "linear-gradient(to right, var(--color-bg), transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-24"
        style={{
          background: "linear-gradient(to left, var(--color-bg), transparent)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
