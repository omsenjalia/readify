/**
 * The RSVP playback state machine, as a pure reducer.
 *
 * Extracted from `Reader.tsx`, which drove index / playing / image-pause /
 * formula-pause through a dozen separate `useState` atoms plus refs that had
 * to be kept in sync on every render. Two defects fell out of that design:
 *
 *  1. `goTo()` cleared the *formula* pause but not the *image* pause, so
 *     stepping off a paused figure left its dwell timer armed. When the timer
 *     fired it called `resume()`, which set `playing = true` — the reader
 *     started reading on its own.
 *  2. `playing` was read through a ref in some paths and through state in
 *     others, so a `step()` taken in the same tick as a `togglePlay()` could
 *     consult a stale value.
 *
 * Both are structural here: every index change goes through `enterItem`, which
 * always clears the previous dwell before considering a new one, and every
 * decision reads from the single immutable state object.
 */

import { isMathToken, mathDwellMs, SPECIAL_DWELL_MS } from "@/lib/math";
import type { ReadItem } from "@/lib/flatten";

/** What is currently holding playback. */
export type DwellKind = "none" | "image" | "math";

export interface EngineState {
  index: number;
  playing: boolean;
  /** Non-"none" while playback is held on a figure or formula. */
  dwell: DwellKind;
  /** Total duration of the active dwell, in ms. */
  dwellMs: number;
  /** Countdown for the on-screen timer, in ms. */
  remainingMs: number;
}

export interface EngineContext {
  items: ReadItem[];
  autoPauseImages: boolean;
  /** Dwell for figures; defaults to the shared 15s special dwell. */
  imageDwellMs?: number;
}

export type EngineAction =
  /** Play/pause, or dismiss an active dwell. */
  | { type: "toggle-play" }
  /** Move by `delta` and apply arrival rules. */
  | { type: "step"; delta: number }
  /** Jump to an index *without* arrival rules (used for resume). */
  | { type: "seek"; index: number }
  /** Advance one item, stopping at the end. */
  | { type: "advance" }
  /** Dismiss the active dwell and start playing. */
  | { type: "resume" }
  /** Update the visible countdown. */
  | { type: "set-remaining"; ms: number };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isMathItem(item: ReadItem | undefined): boolean {
  return item?.kind === "word" && isMathToken(item.text);
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

/** Start a dwell on the item at `kind`, if it deserves one. */
function dwellFor(
  item: ReadItem | undefined,
  ctx: EngineContext,
): { kind: DwellKind; ms: number } {
  if (item?.kind === "image" && ctx.autoPauseImages) {
    return { kind: "image", ms: ctx.imageDwellMs ?? SPECIAL_DWELL_MS };
  }
  if (isMathItem(item)) {
    return { kind: "math", ms: mathDwellMs() };
  }
  return { kind: "none", ms: 0 };
}

/**
 * Move to `index`, clearing any dwell that belonged to the *previous* item.
 *
 * `wasPlaying` decides whether arrival auto-pauses: nudging past a figure with
 * the arrow keys while already paused should not arm a timer.
 */
function enterItem(
  state: EngineState,
  index: number,
  ctx: EngineContext,
  wasPlaying: boolean,
): EngineState {
  const cleared: EngineState = {
    ...state,
    index,
    dwell: "none",
    dwellMs: 0,
    remainingMs: 0,
  };

  if (!wasPlaying) return cleared;

  const { kind, ms } = dwellFor(ctx.items[index], ctx);
  if (kind === "none") return cleared;

  return { ...cleared, playing: false, dwell: kind, dwellMs: ms, remainingMs: ms };
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export function initialEngineState(index = 0, total = 0): EngineState {
  return {
    index: clampIndex(index, total),
    playing: false,
    dwell: "none",
    dwellMs: 0,
    remainingMs: 0,
  };
}

export function engineReducer(
  state: EngineState,
  action: EngineAction,
  ctx: EngineContext,
): EngineState {
  const { items } = ctx;

  switch (action.type) {
    case "toggle-play": {
      // Holding on a figure/formula: the button acts as "skip the pause".
      if (state.dwell !== "none") {
        return { ...state, playing: true, dwell: "none", remainingMs: 0 };
      }

      const { kind, ms } = state.playing
        ? { kind: "none" as DwellKind, ms: 0 }
        : dwellFor(items[state.index], ctx);

      if (kind !== "none") {
        return { ...state, playing: false, dwell: kind, dwellMs: ms, remainingMs: ms };
      }
      return { ...state, playing: !state.playing };
    }

    case "step": {
      const next = clampIndex(state.index + action.delta, items.length);
      if (next === state.index) return state;
      return enterItem(state, next, ctx, state.playing);
    }

    case "seek": {
      const next = clampIndex(action.index, items.length);
      // A deliberate jump shows the item immediately; no auto-pause.
      return { ...state, index: next, dwell: "none", dwellMs: 0, remainingMs: 0 };
    }

    case "advance": {
      const next = state.index + 1;
      if (next >= items.length) {
        // Reached the end: stop, and let the caller persist the final index.
        return { ...state, playing: false };
      }
      return enterItem(state, next, ctx, state.playing);
    }

    case "resume":
      return { ...state, playing: true, dwell: "none", remainingMs: 0 };

    case "set-remaining":
      if (state.dwell === "none") return state;
      return { ...state, remainingMs: action.ms };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

/** Milliseconds left on the active dwell, rounded up for display. */
export function dwellSecondsRemaining(state: EngineState): number {
  if (state.dwell === "none") return 0;
  return Math.max(1, Math.round(state.remainingMs / 1000));
}

/** Interval between items at a given speed. */
export function intervalMsForWpm(wpm: number): number {
  return 60000 / Math.max(wpm, 1);
}
