"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Scroll-reveal wrapper. Content is visible by default (no JS, no motion);
 * when `html.motion` is present the CSS hides it, and this observer adds
 * `.reveal-in` the first time it enters the viewport. Opacity + transform
 * only — space is always reserved, so there is no layout shift.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms. */
  delay?: number;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={clsx("reveal in-view-target", shown && "reveal-in in-view", className)}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
