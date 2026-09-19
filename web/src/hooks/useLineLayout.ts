"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ReadItem } from "@/lib/flatten";
import { formatMathDisplay, isMathToken } from "@/lib/math";
import {
  buildLineIndex,
  layoutLines,
  layoutLinesByChars,
  type TextLine,
} from "@/lib/lines";
import { LINE_FALLBACK_CHARS, LINE_FILL_RATIO } from "@/lib/constants";

/**
 * Line Flow layout: pack the flat RSVP item stream into display lines that
 * fit the stage, interleaving image rows.
 *
 * Two-phase on purpose:
 *
 *  1. A character-budget layout is available synchronously — identical on
 *     the server and during hydration, so the stage can never mismatch.
 *  2. Once mounted, real canvas text metrics replace it. Measurement is
 *     cached per word (documents repeat "the" a lot), so even a 100k-word
 *     PDF lays out in a few tens of milliseconds.
 */

export type LayoutRow =
  | { kind: "line"; start: number; end: number }
  | { kind: "image"; start: number; end: number };

export interface LineLayout {
  rows: LayoutRow[];
  /** Item index → row index (O(1) lookup on every tick). */
  rowOfItem: Int32Array;
  /** Width of one space at the stage font size, in px. */
  spaceWidth: number;
  /** False while running on the character-budget fallback. */
  measured: boolean;
}

/** The text actually rendered for an item (math tokens get normalised). */
export function itemDisplayText(item: ReadItem): string {
  if (item.kind !== "word") return "";
  return isMathToken(item.text) ? formatMathDisplay(item.text) : item.text;
}

/* ------------------------------------------------------------------ */
/* Measurement                                                         */
/* ------------------------------------------------------------------ */

let measureCanvas: HTMLCanvasElement | null = null;
let widthCache: { font: string; map: Map<string, number> } | null = null;

const WIDTH_CACHE_LIMIT = 20_000;

function measureWidths(texts: string[], font: string): number[] {
  if (typeof document === "undefined") return texts.map((t) => t.length);

  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return texts.map((t) => t.length);

  if (!widthCache || widthCache.font !== font) {
    widthCache = { font, map: new Map() };
  }
  const cache = widthCache.map;
  ctx.font = font;

  return texts.map((text) => {
    const hit = cache.get(text);
    if (hit !== undefined) return hit;
    const width = ctx.measureText(text).width;
    if (cache.size < WIDTH_CACHE_LIMIT) cache.set(text, width);
    return width;
  });
}

/* ------------------------------------------------------------------ */
/* Row building                                                        */
/* ------------------------------------------------------------------ */

function packRun(
  items: ReadItem[],
  runStart: number,
  runEnd: number,
  widths: number[] | null,
  spaceWidth: number,
  maxWidth: number,
  maxChars: number,
): LayoutRow[] {
  const texts: string[] = [];
  const indices: number[] = [];
  for (let i = runStart; i < runEnd; i++) {
    const item = items[i];
    if (item.kind === "word") {
      texts.push(itemDisplayText(item));
      indices.push(i);
    }
  }
  if (!texts.length) return [];

  let lines: TextLine[];
  if (widths && maxWidth > 0) {
    lines = layoutLines(
      indices.map((i) => widths[i]),
      spaceWidth,
      maxWidth,
    );
  } else {
    lines = layoutLinesByChars(texts, maxChars);
  }

  return lines.map((line) => ({
    kind: "line" as const,
    start: indices[line.start],
    end: indices[line.end - 1] + 1,
  }));
}

function buildLayout(
  items: ReadItem[],
  opts: {
    widths: number[] | null;
    spaceWidth: number;
    maxWidth: number;
    maxChars: number;
  },
): LineLayout {
  const rows: LayoutRow[] = [];
  let runStart = -1;

  const flush = (runEnd: number) => {
    if (runStart >= 0) {
      rows.push(
        ...packRun(
          items,
          runStart,
          runEnd,
          opts.widths,
          opts.spaceWidth,
          opts.maxWidth,
          opts.maxChars,
        ),
      );
      runStart = -1;
    }
  };

  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === "image") {
      flush(i);
      rows.push({ kind: "image", start: i, end: i + 1 });
    } else if (runStart < 0) {
      runStart = i;
    }
  }
  flush(items.length);

  return {
    rows,
    rowOfItem: buildLineIndex(rows, items.length),
    spaceWidth: opts.spaceWidth,
    measured: opts.widths !== null,
  };
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/** Rough mean glyph advance for Inter 600 — used before metrics exist. */
const APPROX_CHAR_FACTOR = 0.52;

/**
 * Hydration gate via `useSyncExternalStore` (false on the server, true on the
 * client) — canvas metrics may only be computed after hydration, or the
 * server HTML and the first client render would disagree.
 */
const noopSubscribe = () => () => {};
const clientTrue = () => true;
const serverFalse = () => false;

export interface UseLineLayoutOptions {
  items: ReadItem[];
  fontSize: number;
  /** Stage content width in px; 0 until the ResizeObserver reports one. */
  containerWidth: number;
  /** Resolved font-family list from the stage element (post-mount). */
  fontFamily: string | null;
}

export function useLineLayout({
  items,
  fontSize,
  containerWidth,
  fontFamily,
}: UseLineLayoutOptions): LineLayout {
  const maxWidth = Math.floor(containerWidth * LINE_FILL_RATIO);
  const maxChars =
    maxWidth > 0
      ? Math.max(12, Math.floor(maxWidth / (fontSize * APPROX_CHAR_FACTOR)))
      : LINE_FALLBACK_CHARS;

  // Phase 1 — deterministic character layout (server + hydration safe).
  const charLayout = useMemo(
    () =>
      buildLayout(items, {
        widths: null,
        spaceWidth: fontSize * 0.28,
        maxWidth: 0,
        maxChars,
      }),
    [items, maxChars, fontSize],
  );

  // Phase 2 — measured layout, computed after hydration only.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    clientTrue,
    serverFalse,
  );

  const measuredLayout = useMemo(() => {
    if (!hydrated || containerWidth <= 0) return null;

    const families = fontFamily ?? "Inter, system-ui, sans-serif";
    const font = `600 ${fontSize}px ${families}`;

    const texts = items.map((item) =>
      item.kind === "word" ? itemDisplayText(item) : " ",
    );
    const widths = measureWidths(texts, font);
    const spaceWidth = measureWidths([" "], font)[0] || fontSize * 0.28;

    return buildLayout(items, { widths, spaceWidth, maxWidth, maxChars });
  }, [hydrated, containerWidth, items, fontSize, fontFamily, maxWidth, maxChars]);

  return measuredLayout ?? charLayout;
}
