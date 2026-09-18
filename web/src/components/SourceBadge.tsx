import clsx from "clsx";
import { AlignLeft, Play } from "lucide-react";

/**
 * File-type badge for a document row.
 *
 * Replaces three divergent implementations (library table, stats page,
 * dashboard) that each rendered the same four source types with different
 * colours, radii and labels. One component, three sizes.
 */

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; text: string; icon: number }> = {
  sm: { box: "h-6 min-w-8 px-1", text: "text-[9px]", icon: 12 },
  md: { box: "h-7 min-w-10 px-1.5", text: "text-[10px]", icon: 14 },
  lg: { box: "h-8 min-w-12 px-2", text: "text-[11px]", icon: 16 },
};

const LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  text: "TXT",
  txt: "TXT",
  image: "IMG",
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
    "inline-flex shrink-0 items-center justify-center rounded font-bold uppercase tracking-wide",
    s.box,
    s.text,
    className,
  );

  if (type === "pdf") {
    return <span className={clsx(base, "bg-red-600 text-white")}>PDF</span>;
  }

  if (type === "docx") {
    return <span className={clsx(base, "bg-blue-600 text-white")}>DOCX</span>;
  }

  if (type === "youtube") {
    return (
      <span
        className={clsx(
          base,
          "rounded-full bg-red-600 text-white",
          s.box.replace(/min-w-\S+/, ""),
        )}
        aria-label="YouTube"
      >
        <Play size={s.icon} className="fill-current" />
      </span>
    );
  }

  return (
    <span
      className={clsx(base, "bg-[var(--surface-soft)] text-[var(--muted)]")}
      aria-label="Text document"
    >
      <AlignLeft size={s.icon} />
    </span>
  );
}

/** Human label for a source type, e.g. in a table's "Type" column. */
export function sourceTypeLabel(type: string): string {
  return LABELS[type] ?? "TXT";
}
