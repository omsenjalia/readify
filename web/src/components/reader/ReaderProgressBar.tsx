"use client";

/** Thin progress rail plus the "x% complete · n words left" caption. */
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
    <div className="mx-auto w-full max-w-3xl px-6 pb-1 pt-3">
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-gray-200/70">
        <div
          className="h-full rounded-full bg-[#4F6EF6] transition-all duration-200"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
        <span>
          {percent}% complete · {index + 1}/{total}
        </span>
        <span>
          {wordsLeft.toLocaleString()} words · {minutesLeft} min left
        </span>
      </div>
    </div>
  );
}
