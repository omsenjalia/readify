"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import LineStage from "@/components/reader/LineStage";
import { tokenizeText } from "@/lib/tokenize";
import { intervalMsForWpm } from "@/lib/reader-engine";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ReadItem } from "@/lib/flatten";

/**
 * A live Line Flow demo — the real reader stage, the real layout engine, a
 * paragraph about itself. It autoplays while on screen and toggles on click,
 * so the hero *is* the product pitch.
 */

const SAMPLE =
  "Your eyes never have to move now. The line slides beneath one fixed point of focus while the pivot character lands exactly where your attention is already waiting. No searching, no skipping back, no lost place — just a steady rhythm that keeps accelerating until reading feels like thinking.";

const DEMO_WPM = 240;

export default function HeroDemo() {
  const items = useMemo<ReadItem[]>(
    () =>
      tokenizeText(SAMPLE).map((text) => ({
        kind: "word" as const,
        text,
      })),
    [],
  );

  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const isSmall = useMediaQuery("(max-width: 639px)");
  const fontSize = isSmall ? 19 : 28;

  const playing = !userPaused && visible;

  const cardRef = useRef<HTMLDivElement>(null);

  // Pause while scrolled away — no invisible CPU burn, resumes on return.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      intervalMsForWpm(DEMO_WPM),
    );
    return () => clearInterval(id);
  }, [playing, items.length]);

  const toggle = () => setUserPaused((v) => !v);

  return (
    <div
      ref={cardRef}
      className="relative w-full overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-[var(--shadow-card)]"
    >
      {/* Card chrome */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <span className="pill pill-accent !text-[11px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="mono uppercase tracking-[0.12em]">
            Line Flow · live demo
          </span>
        </span>
        <span className="mono text-[11px] font-semibold text-subtle tabular-nums">
          {DEMO_WPM} WPM
        </span>
      </div>

      {/* The stage — click/tap anywhere to play/pause */}
      <div
        className="relative cursor-pointer px-2 py-6 sm:px-6 sm:py-9"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-label={playing ? "Pause demo" : "Play demo"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {/* centre glow behind the pivot */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--glow-radial)" }}
          aria-hidden="true"
        />
        <LineStage
          items={items}
          index={index}
          fontSize={fontSize}
          highlightOrp
          stepMs={intervalMsForWpm(DEMO_WPM)}
          showContext={false}
        />
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause demo" : "Play demo"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-bg transition active:scale-95"
        >
          {playing ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
          )}
        </button>
        <p className="mono text-[11px] font-medium text-subtle sm:text-xs">
          The pivot never moves — the text does.{" "}
          <span className="hidden sm:inline">Tap the card to pause.</span>
        </p>
      </div>
    </div>
  );
}
