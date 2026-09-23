import clsx from "clsx";
import { AlignLeft, Play } from "lucide-react";

/**
 * File-type badge for a document row.
 *
 * One component, three sizes. Colours are conventional (red PDF, blue DOCX,
 * red YouTube) but rendered as soft tinted pills so they sit inside the
 * green-toned design system instead of shouting over it; plain text gets the
 * brand accent.
 */

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; text: string; icon: number }> = {
  sm: { box: "h-6 min-w-8 px-1", text: "text-[9px]", icon: 12 },
  md: { box: "h-7 min-w-10 px-1.5", text: "text-[10px]", icon: 14 },
  lg: { box: "h-9 min-w-12 px-2", text: "text-[11px]", icon: 16 },
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
    "inline-flex shrink-0 items-center justify-center rounded-lg font-bold uppercase tracking-wide",
    s.box,
    s.text,
    className,
  );

  if (type === "pdf") {
    return (
      <span
        className={clsx(
          base,
          "bg-red-500/15 text-red-400 light:bg-red-500/10 light:text-red-600",
        )}
      >
        PDF
      </span>
    );
  }

  if (type === "docx") {
    return (
      <span
        className={clsx(
          base,
          "bg-sky-500/15 text-sky-400 light:bg-sky-500/10 light:text-sky-600",
        )}
      >
        DOCX
      </span>
    );
  }

  if (type === "youtube") {
    return (
      <span
        className={clsx(
          base,
          "rounded-full bg-red-500/15 text-red-400 light:bg-red-500/10 light:text-red-600",
        )}
        aria-label="YouTube"
      >
        <Play size={s.icon} className="fill-current" />
      </span>
    );
  }

  return (
    <span
      className={clsx(base, "bg-accent-soft text-accent")}
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
