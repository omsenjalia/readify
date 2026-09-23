import clsx from "clsx";
import { Play } from "lucide-react";

/**
 * File-type badge for a document row.
 *
 * One component, three sizes. Conventional colour coding (red PDF, blue
 * DOCX, red YouTube) rendered as quiet editorial chips — a hairline border,
 * mono label, and a small type dot — so they sit inside the Paper system
 * without shouting. Plain text gets the brand accent dot.
 */

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; text: string; icon: number }> = {
  sm: { box: "h-6 min-w-8 px-1.5 gap-1", text: "text-[9px]", icon: 11 },
  md: { box: "h-7 min-w-10 px-2 gap-1.5", text: "text-[10px]", icon: 13 },
  lg: { box: "h-9 min-w-12 px-2.5 gap-1.5", text: "text-[11px]", icon: 15 },
};

const LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  text: "TXT",
  txt: "TXT",
  image: "IMG",
};

const DOTS: Record<string, string> = {
  pdf: "var(--color-danger)",
  docx: "var(--color-accent)",
  youtube: "var(--color-danger)",
  text: "var(--color-line-strong)",
  txt: "var(--color-line-strong)",
  image: "var(--color-line-strong)",
};

export default function SourceBadge({
  type,
  size = "md",
  className,
}: {
  type: string;
  size?: Size;
  className?: string;
}) {
  const s = SIZES[size];
  const base = clsx(
    "mono inline-flex shrink-0 items-center justify-center rounded-lg border border-line bg-surface font-semibold uppercase tracking-[0.08em] text-muted",
    s.box,
    s.text,
    className,
  );

  if (type === "youtube") {
    return (
      <span className={base} aria-label="YouTube source">
        <Play size={s.icon} className="shrink-0 fill-danger text-danger" />
        YT
      </span>
    );
  }

  const label = LABELS[type] ?? "TXT";
  return (
    <span className={base} aria-label={`${label} document`}>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: DOTS[type] ?? "var(--color-line-strong)" }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

/** Human label for a source type, e.g. in a table's "Type" column. */
export function sourceTypeLabel(type: string): string {
  return LABELS[type] ?? "TXT";
}
