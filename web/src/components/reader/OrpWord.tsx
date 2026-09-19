"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { splitAtORP } from "@/lib/orp";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * One RSVP word with its Optimal Recognition Point pinned to the stage's
 * centre axis.
 *
 * The old implementation faked alignment with three fixed-width columns
 * (4.2em / 0.72em / 4.2em). Any word wider than the column budget spilled
 * out of its box, so the pivot visibly drifted off centre — the "text isn't
 * centred" bug. This version measures the ORP character's real offset after
 * layout and translates the word so the character lands exactly on 50%,
 * for every word in every script.
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

  const wordRef = useRef<HTMLSpanElement>(null);
  const orpRef = useRef<HTMLSpanElement>(null);

  // Re-align before paint on every word change so the pivot never jumps.
  useIsomorphicLayoutEffect(() => {
    const wordEl = wordRef.current;
    const orpEl = orpRef.current;
    if (!wordEl || !orpEl) return;

    // The word span is the ORP span's offset parent ("relative"), so this is
    // the pivot's centre measured from the word's own left edge.
    const pivot = orpEl.offsetLeft + orpEl.offsetWidth / 2;
    const shift = wordEl.offsetWidth / 2 - pivot;
    wordEl.style.transform = `translate3d(${shift}px, 0, 0)`;
  }, [word]);

  return (
    <div className="relative flex w-full items-center justify-center">
      <span
        key={word}
        className="orp-word-in relative whitespace-pre"
        ref={wordRef}
        style={{ fontSize, lineHeight: 1.1, fontWeight: 700 }}
      >
        {before}
        <span
          ref={orpRef}
          style={{
            color: highlightOrp ? "var(--color-orp)" : "inherit",
            fontWeight: highlightOrp ? 800 : 700,
          }}
        >
          {orp}
        </span>
        {after}
      </span>
    </div>
  );
}
