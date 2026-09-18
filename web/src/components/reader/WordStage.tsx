"use client";

import { isMathToken } from "@/lib/math";
import type { ReadItem } from "@/lib/flatten";
import OrpWord from "@/components/reader/OrpWord";
import MathStage from "@/components/reader/MathStage";

/** Vertical space reserved for the previous/next word previews. */
const STAGE_HEIGHT = 240;

/**
 * The reading stage: the previous word (faded, above), the current word or
 * formula (centred), and the next word (faded, below).
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

  return (
    <div
      className="flex w-full max-w-3xl flex-col items-center justify-center"
      style={{ height: STAGE_HEIGHT }}
    >
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
      className="flex h-[40%] w-full items-center justify-center overflow-hidden"
      style={{
        fontSize: fontSize * 0.6,
        color: "var(--muted-foreground)",
        opacity: 0.3,
      }}
      aria-hidden="true"
    >
      <span className="truncate">{text}</span>
    </div>
  );
}
