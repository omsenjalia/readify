import clsx from "clsx";

/**
 * The Read/IO mark: three text lines with the accent pivot dot on the centre
 * line — Line Flow reduced to a glyph. The eye (dot) never moves; the lines
 * do. The wordmark is spelled Read/IO.
 */
export default function Brand({
  size = "md",
  withWordmark = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
}) {
  const box = size === "lg" ? 30 : size === "sm" ? 18 : 22;
  const text =
    size === "lg"
      ? "text-xl"
      : size === "sm"
        ? "text-[15px]"
        : "text-base";

  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <svg
        width={box}
        height={box}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="22"
          height="22"
          rx="7"
          fill="var(--color-accent-soft)"
          stroke="color-mix(in srgb, var(--color-accent) 35%, transparent)"
          strokeWidth="1"
        />
        <path
          d="M6 8.5h12"
          stroke="var(--color-muted)"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M6 15.5h12"
          stroke="var(--color-muted)"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M6 12h9"
          stroke="var(--color-ink)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="16.4" cy="12" r="2.1" fill="var(--color-accent)" />
      </svg>
      {withWordmark && (
        <span className={clsx("font-semibold tracking-tight text-ink", text)}>
          Read<span className="text-accent">/</span>IO
        </span>
      )}
    </span>
  );
}
