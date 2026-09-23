import {
  FileText,
  FileType,
  Languages,
  MonitorPlay,
  ScanText,
  Type,
} from "lucide-react";

const ITEMS = [
  { icon: FileText, label: "PDF" },
  { icon: FileType, label: "DOCX" },
  { icon: MonitorPlay, label: "YouTube" },
  { icon: Type, label: "Markdown" },
  { icon: FileText, label: "Plain text" },
  { icon: ScanText, label: "Scanned OCR" },
  { icon: Languages, label: "हिन्दी" },
  { icon: Languages, label: "ગુજરાતી" },
];

/**
 * Endless source-format ticker — the "trusted by" band, but for inputs
 * instead of logos. Duplicated track + translateX(-50%) loop.
 */
export default function Marquee() {
  // Two identical half-tracks; translateX(-50%) on the wrapper is then exactly
  // one copy wide, so the loop is seamless.
  const halfTrack = (ariaHidden: boolean) => (
    <div
      className="flex shrink-0 items-center gap-4 pr-4"
      aria-hidden={ariaHidden || undefined}
    >
      {ITEMS.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-muted"
        >
          <item.icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
          {item.label}
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee-paused relative w-full overflow-hidden border-y border-line bg-bg-elevated/40 py-5">
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
