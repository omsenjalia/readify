"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

/**
 * Cycles through `words` inside a fixed-width slot (an inline grid where
 * every candidate occupies the same cell), so the headline never reflows
 * while the word swaps.
 */
export default function RotatingWord({
  words,
  intervalMs = 2600,
  className,
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(
      () => setActive((v) => (v + 1) % words.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    // justify-items-center keeps every candidate optically centred inside the
    // fixed-width (widest-word) slot, so the headline stays balanced as words
    // of different lengths rotate through.
    <span className={clsx("inline-grid justify-items-center align-baseline", className)}>
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== active}
          className={clsx(
            "col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-200",
            i === active
              ? "word-swap-in opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
