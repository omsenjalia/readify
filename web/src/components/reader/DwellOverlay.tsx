"use client";

import { dwellSecondsRemaining } from "@/lib/reader-engine";
import type { EngineState } from "@/lib/reader-engine";

/**
 * "Figure pause / Formula pause — 12s — Continue" chip shown while playback is
 * held. The reader previously had two near-identical copies with different
 * colour tokens and different rounding.
 */
export default function DwellOverlay({
  state,
  label,
  onContinue,
}: {
  state: EngineState;
  label: string;
  onContinue: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-line bg-bg-elevated px-4 py-2 text-sm text-ink shadow-sm">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-orp/15 text-xs font-bold text-orp">
          {dwellSecondsRemaining(state)}
        </span>
        <span className="text-muted">{label}</span>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink-inv transition hover:opacity-90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
