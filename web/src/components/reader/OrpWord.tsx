"use client";

import { useMemo } from "react";
import { splitAtORP } from "@/lib/orp";

const ORP_COLOR = "#4F6EF6";

/**
 * The RSVP word, split into three fixed-width columns so the highlighted
 * character stays on the same optical axis for every word.
 *
 * The reader previously called `splitAtORP(word)` three separate times per
 * render (once per column).
 */
export default function OrpWord({
  word,
  fontSize,
  highlightOrp,
}: {
  word: string;
  fontSize: number;
  highlightOrp: boolean;
}) {
  const { before, orp, after } = useMemo(() => splitAtORP(word), [word]);

  const sideWidth = fontSize * 4.2;
  const orpWidth = fontSize * 0.72;

  return (
    <div className="relative flex">
      {/* Optical-axis guide rail and its top marker. */}
      <div
        className="absolute inset-y-[-14px] w-px bg-indigo-400/25"
        style={{ left: `calc(50% - ${orpWidth / 2}px)` }}
        aria-hidden="true"
      />
      <div
        className="absolute -top-[14px] h-1 w-1 rounded-full bg-[#4f46e5]"
        style={{ left: "calc(50% - 2px)" }}
        aria-hidden="true"
      />

      <div
        className="relative flex"
        style={{ fontSize, lineHeight: 1.1, fontWeight: 600 }}
      >
        <span style={{ width: sideWidth, textAlign: "right" }} className="whitespace-pre">
          {before}
        </span>
        <span
          style={{
            width: orpWidth,
            textAlign: "center",
            fontWeight: highlightOrp ? 800 : 600,
            color: highlightOrp ? ORP_COLOR : "inherit",
          }}
        >
          {orp}
        </span>
        <span style={{ width: sideWidth, textAlign: "left" }} className="whitespace-pre">
          {after}
        </span>
      </div>
    </div>
  );
}
