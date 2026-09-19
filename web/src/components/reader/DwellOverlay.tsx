"use client";

import { dwellSecondsRemaining } from "@/lib/reader-engine";
import type { EngineState } from "@/lib/reader-engine";

/**
 * "Figure pause / Formula pause — 12s — Continue" chip shown while playback
 * is held on an image or equation.
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
      <div className="flex items-center gap-2.5 rounded-full border border-line bg-bg-elevated px-4 py-2 text-sm shadow-[var(--shadow-card)]">
        <span
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums"
          style={{
            background: "var(--color-accent-soft)",
            color: "var(--color-accent-text)",
          }}
        >
          {dwellSecondsRemaining(state)}
        </span>
        <span className="text-muted">{label}</span>
        <button
          type="button"
          onClick={onContinue}
          className="btn btn-primary btn-sm !px-3.5 !py-1.5 text-xs"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
