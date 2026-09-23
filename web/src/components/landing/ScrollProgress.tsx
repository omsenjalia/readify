"use client";

import { useEffect, useState } from "react";

/**
 * A 2px accent hairline under the nav that tracks page scroll.
 * Passive listener + rAF throttle: no jank, and it is hidden entirely when
 * the user prefers reduced motion (see globals.css).
 */
export default function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setPct(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="scroll-progress"
      style={{ transform: `scaleX(${pct})` }}
      aria-hidden="true"
    />
  );
}
