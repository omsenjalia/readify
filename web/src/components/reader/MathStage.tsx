"use client";

import { useMemo } from "react";
import {
  formatMathDisplay,
  isComparisonToken,
  isDefinitionToken,
  splitComparison,
} from "@/lib/math";

const ACCENT = "var(--color-orp, #4f46e5)";

/**
 * Renders a math token at the centre of the reader.
 *
 * Three shapes, in priority order:
 *  - a magnetic/electric style comparison row (`A = x  ⇔  B = y`) stacked
 *  - a definition ("Term = a long English gloss")
 *  - a plain formula, sized down as it gets longer
 */
export default function MathStage({
  token,
  fontSize,
}: {
  token: string;
  fontSize: number;
}) {
  // `splitComparison` used to be called three times per render for the same
  // token (once to test, twice for the sides).
  const comparison = useMemo(
    () =>
      isComparisonToken(token) ? splitComparison(token) : null,
    [token],
  );

  if (comparison) {
    return (
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <ComparisonSide label="Magnetic" expression={comparison.left} fontSize={fontSize} />
        <ComparisonSide label="Electric" expression={comparison.right} fontSize={fontSize} />
      </div>
    );
  }

  if (isDefinitionToken(token)) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-line bg-bg-elevated px-5 py-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Definition
        </p>
        <p
          className="mt-1 font-semibold leading-snug"
          style={{ fontSize: Math.min(fontSize * 0.8, 30) }}
        >
          {formatMathDisplay(token)}
        </p>
      </div>
    );
  }

  return (
    <div
      className="max-w-full text-center font-semibold tracking-tight"
      style={{
        fontSize: Math.min(fontSize, Math.max(22, 52 - token.length / 2.5)),
        lineHeight: 1.3,
        color: ACCENT,
      }}
    >
      {formatMathDisplay(token)}
    </div>
  );
}

function ComparisonSide({
  label,
  expression,
  fontSize,
}: {
  label: string;
  expression: string;
  fontSize: number;
}) {
  return (
    <div className="rounded-2xl border border-line bg-bg-elevated px-4 py-3 text-center">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className="font-semibold leading-snug"
        style={{ fontSize: Math.min(fontSize * 0.85, 32), color: ACCENT }}
      >
        {formatMathDisplay(expression)}
      </p>
    </div>
  );
}
