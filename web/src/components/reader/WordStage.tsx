"use client";

import { isMathToken } from "@/lib/math";
import type { ReadItem } from "@/lib/flatten";
import OrpWord from "@/components/reader/OrpWord";
import MathStage from "@/components/reader/MathStage";

/**
 * Classic RSVP stage: the previous word (faded, above), the current word or
 * formula (centred on the pivot axis), and the next word (faded, below).
 *
 * The optical-axis rail now runs through the true centre of the stage and
 * the word itself is aligned by measurement (`OrpWord`), so long words can
 * no longer drift off-axis.
 */
export default function WordStage({
  current,
  previous,
  next,
  fontSize,
  highlightOrp,
}: {
  current: ReadItem | undefined;
  previous: ReadItem | undefined;
  next: ReadItem | undefined;
  fontSize: number;
  highlightOrp: boolean;
}) {
  const currentWord = current?.kind === "word" ? current.text : "";
  const stageHeight = Math.max(220, Math.round(fontSize * 5.2));

  return (
    <div
      className="relative flex w-full max-w-4xl flex-col items-center justify-center select-none"
      style={{ height: stageHeight, fontFamily: "var(--font-reader)" }}
    >
      {/* Optical-axis rail + top marker, dead centre. */}
      <div
        className="pointer-events-none absolute inset-y-6 left-1/2 w-px -translate-x-1/2"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-accent) 26%, transparent), transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-5 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
        style={{ background: "var(--color-accent)" }}
        aria-hidden="true"
      />

      <ContextLine item={previous} fontSize={fontSize} />

      <div className="relative flex w-full items-center justify-center">
        {current?.kind === "word" && isMathToken(current.text) ? (
          <div className="flex w-full max-w-4xl flex-col items-center gap-2 px-4">
            <MathStage token={current.text} fontSize={fontSize} />
          </div>
        ) : (
          <OrpWord
            word={currentWord}
            fontSize={fontSize}
            highlightOrp={highlightOrp}
          />
        )}
      </div>

      <ContextLine item={next} fontSize={fontSize} next />
    </div>
  );
}

/** The dimmed previous/next preview. Announces images and formulas. */
function ContextLine({
  item,
  fontSize,
  next = false,
}: {
  item: ReadItem | undefined;
  fontSize: number;
  next?: boolean;
}) {
  let text = "";
  if (item?.kind === "image") {
    text = next ? "↓ image next" : "";
  } else if (item?.kind === "word") {
    text = next && isMathToken(item.text) ? "↓ formula next" : item.text;
  }

  return (
    <div
      className="fade-x flex h-[38%] w-full items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <span
        className="max-w-full truncate whitespace-nowrap font-medium"
        style={{
          fontSize: fontSize * 0.55,
          color: "color-mix(in srgb, var(--color-ink) 24%, transparent)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
