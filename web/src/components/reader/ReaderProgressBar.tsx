"use client";

/** Thin green progress rail plus the "x% complete · n words left" caption. */
export default function ReaderProgressBar({
  percent,
  wordsLeft,
  minutesLeft,
  index,
  total,
}: {
  percent: number;
  wordsLeft: number;
  minutesLeft: number;
  /** Zero-based item index, for the "n/total" readout. */
  index: number;
  total: number;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-1 pt-3 sm:px-6">
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-soft">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${percent}%`,
            background:
              "linear-gradient(90deg, var(--color-accent-strong), var(--color-accent))",
            boxShadow: "0 0 12px color-mix(in srgb, var(--color-accent) 50%, transparent)",
          }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-muted tabular-nums sm:text-xs">
        <span>
          {percent}% · {index + 1}/{total.toLocaleString()}
        </span>
        <span>
          {wordsLeft.toLocaleString()} words · {minutesLeft} min left
        </span>
      </div>
    </div>
  );
}
