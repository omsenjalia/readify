"use client";

import type { ReactNode } from "react";

/** Labelled range input with min/max end labels. Used by every reader panel. */
export default function SliderRow({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueLabel: ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-sm font-bold text-ink tabular-nums">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-accent"
        aria-label={label}
      />
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-subtle tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
