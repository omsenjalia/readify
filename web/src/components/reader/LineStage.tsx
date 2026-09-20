"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import type { ReadItem } from "@/lib/flatten";
import { isMathToken } from "@/lib/math";
import { splitAtORP } from "@/lib/orp";
import {
  itemDisplayText,
  useLineLayout,
  type LayoutRow,
} from "@/hooks/useLineLayout";

/**
 * Line Flow — the whole line, one fixation.
 *
 * Classic RSVP flashes a single word; Line Flow shows the *entire current
 * line* as a horizontal strip and slides it so the focused word stays at the
 * stage's centre axis. The line advances under a perfectly still eye: context
 * comes from the periphery, precision from the fixed green pivot. The pivot
 * is held for the whole word rather than jumping to each word's ORP character.
 *
 * Positioning is measured, not guessed: after each render a layout effect
 * reads the focused word's real offset and writes the strip transform before
 * paint, so there is no flash of misaligned text. Fonts, size changes and
 * viewport resizes all re-measure through `useLineLayout`.
 */

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface LineStageProps {
  items: ReadItem[];
  /** Current item index (must point at a word item). */
  index: number;
  fontSize: number;
  highlightOrp: boolean;
  /** Interval between words in ms — sets the slide transition duration. */
  stepMs: number;
  /** Dimmed previous/next line previews. The hero demo turns these off. */
  showContext?: boolean;
  className?: string;
}

interface StageWord {
  i: number;
  text: string;
  math: boolean;
  split: { before: string; orp: string; after: string } | null;
}

export default function LineStage({
  items,
  index,
  fontSize,
  highlightOrp,
  stepMs,
  showContext = true,
  className,
}: LineStageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineWrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const wordEls = useRef<Record<number, HTMLSpanElement | null>>({});
  const orpEls = useRef<Record<number, HTMLSpanElement | null>>({});

  const [containerWidth, setContainerWidth] = useState(0);
  /** Resolved once webfonts are ready so metrics match what is rendered. */
  const [fontFamily, setFontFamily] = useState<string | null>(null);

  /* ---------------- width + font resolution ---------------- */

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setContainerWidth(Math.round(width));
    });
    ro.observe(el);
    setContainerWidth(Math.round(el.getBoundingClientRect().width));

    let cancelled = false;
    const resolveFont = () => {
      if (!cancelled) setFontFamily(getComputedStyle(el).fontFamily);
    };
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(resolveFont, resolveFont);
    } else {
      resolveFont();
    }

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, []);

  const layout = useLineLayout({ items, fontSize, containerWidth, fontFamily });
  const { rows, rowOfItem, spaceWidth } = layout;

  const rowIdx =
    index >= 0 && index < rowOfItem.length ? rowOfItem[index] : -1;
  const currentRow: LayoutRow | undefined =
    rowIdx >= 0 ? rows[rowIdx] : undefined;
  const isLineRow = currentRow?.kind === "line";

  /* ---------------- enter-animation direction ----------------
     Chosen in a layout effect (never during render): when the line changes,
     the keyed wrapper remounts and gets its slide-in class before paint.
     Within a line the class stays put, so the animation never re-fires. */

  const enterRef = useRef<HTMLDivElement>(null);
  const lastIndexRef = useRef(index);
  const enterRowRef = useRef(-1);
  useIsomorphicLayoutEffect(() => {
    const el = enterRef.current;
    // Only (re)apply the slide-in when the line itself changed — stepping
    // words within a line must not replay the animation.
    if (el && rowIdx !== enterRowRef.current) {
      const forward = index >= lastIndexRef.current;
      el.classList.toggle("line-enter-forward", forward);
      el.classList.toggle("line-enter-backward", !forward);
      enterRowRef.current = rowIdx;
    }
    lastIndexRef.current = index;
  }, [index, rowIdx]);

  /* ---------------- neighbour context lines ---------------- */

  const lineText = (row: LayoutRow | undefined): string => {
    if (!row || row.kind !== "line") return "";
    const parts: string[] = [];
    for (let i = row.start; i < row.end; i++) {
      const item = items[i];
      if (item?.kind === "word") parts.push(itemDisplayText(item));
    }
    return parts.join(" ");
  };

  const contextRows = useMemo(() => {
    let prev: LayoutRow | undefined;
    let next: LayoutRow | undefined;
    for (let r = rowIdx - 1; r >= 0; r--) {
      if (rows[r].kind === "line") {
        prev = rows[r];
        break;
      }
    }
    for (let r = rowIdx + 1; r < rows.length; r++) {
      if (rows[r].kind === "line") {
        next = rows[r];
        break;
      }
    }
    return { prev, next };
  }, [rows, rowIdx]);

  /* ---------------- words on the current line ---------------- */

  const stageWords: StageWord[] = useMemo(() => {
    if (!currentRow || currentRow.kind !== "line") return [];
    const out: StageWord[] = [];
    for (let i = currentRow.start; i < currentRow.end; i++) {
      const item = items[i];
      if (!item || item.kind !== "word") continue;
      const math = isMathToken(item.text);
      const text = itemDisplayText(item);
      out.push({ i, text, math, split: math ? null : splitAtORP(text) });
    }
    return out;
  }, [currentRow, items]);

  /* ---------------- focus alignment (before paint) ---------------- */

  useIsomorphicLayoutEffect(() => {
    const strip = stripRef.current;
    const lineWrap = lineWrapRef.current;
    if (!strip || !lineWrap || !isLineRow) return;

    // Align the whole current word, not its ORP character. This means the
    // focus point stays fixed for the entire word; advancing to another word
    // is the only time the strip needs to move.
    const target = wordEls.current[index];
    if (!target) return;

    // offsetLeft is measured against the strip (the nearest positioned
    // ancestor) and is unaffected by the strip's own transform, so the
    // pivot stays stable while the strip slides.
    const pivot = target.offsetLeft + target.offsetWidth / 2;
    const x = lineWrap.clientWidth / 2 - pivot;
    strip.style.transform = `translate3d(${x}px, 0, 0)`;
  }, [
    index,
    rowIdx,
    isLineRow,
    containerWidth,
    fontSize,
    spaceWidth,
    layout.measured,
    items,
    stageWords,
  ]);

  const transitionMs = Math.max(90, Math.min(stepMs * 0.6, 320));

  /* ---------------- render ---------------- */

  const lineHeight = Math.round(fontSize * 1.35);

  return (
    <div
      ref={wrapRef}
      className={clsx("relative w-full select-none", className)}
      style={{ fontFamily: "var(--font-reader)" }}
    >
      {showContext && (
        <ContextLine
          text={lineText(contextRows.prev)}
          fontSize={fontSize}
          height={Math.round(fontSize * 0.9)}
        />
      )}

      {/* Focus line */}
      <div
        ref={lineWrapRef}
        className="fade-x relative w-full overflow-hidden"
        style={{ height: lineHeight }}
      >
        {/* Centre-axis marker: the eye stays here, the text moves. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          style={{ background: "var(--color-accent)" }}
          aria-hidden="true"
        />

        {isLineRow && (
          <div key={rowIdx} ref={enterRef} className="absolute inset-0">
            <div
              ref={stripRef}
              className="absolute left-0 top-0 flex h-full items-center whitespace-nowrap will-change-transform"
              style={{
                gap: spaceWidth,
                transition: `transform ${transitionMs}ms cubic-bezier(0.25, 1, 0.35, 1)`,
                fontSize,
                lineHeight: 1.15,
              }}
            >
              {stageWords.map((w) => {
                const isCurrent = w.i === index;
                const read = w.i < index;

                const color = w.math
                  ? "var(--color-accent-text)"
                  : isCurrent
                    ? "var(--color-ink)"
                    : read
                      ? "color-mix(in srgb, var(--color-ink) 34%, transparent)"
                      : "color-mix(in srgb, var(--color-ink) 58%, transparent)";

                return (
                  <span
                    key={w.i}
                    ref={(el) => {
                      wordEls.current[w.i] = el;
                      return () => {
                        wordEls.current[w.i] = null;
                      };
                    }}
                    className="whitespace-pre"
                    style={{
                      color,
                      fontWeight: isCurrent ? 700 : 600,
                      transition: "color 140ms ease",
                    }}
                  >
                    {w.math || !w.split ? (
                      w.text
                    ) : (
                      <>
                        {w.split.before}
                        <span
                          ref={(el) => {
                            orpEls.current[w.i] = el;
                            return () => {
                              orpEls.current[w.i] = null;
                            };
                          }}
                          style={
                            highlightOrp && isCurrent
                              ? {
                                  color: "var(--color-orp)",
                                  fontWeight: 800,
                                }
                              : undefined
                          }
                        >
                          {w.split.orp}
                        </span>
                        {w.split.after}
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showContext && (
        <ContextLine
          text={lineText(contextRows.next)}
          fontSize={fontSize}
          height={Math.round(fontSize * 0.9)}
        />
      )}
    </div>
  );
}

/** A dimmed neighbour line — peripheral context, never the focus. */
function ContextLine({
  text,
  fontSize,
  height,
}: {
  text: string;
  fontSize: number;
  height: number;
}) {
  return (
    <div
      className="fade-x flex w-full items-center justify-center overflow-hidden"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="max-w-full truncate whitespace-nowrap font-medium"
        style={{
          fontSize: fontSize * 0.58,
          color: "color-mix(in srgb, var(--color-ink) 22%, transparent)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
