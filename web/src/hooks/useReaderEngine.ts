"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  engineReducer,
  initialEngineState,
  intervalMsForWpm,
  type EngineAction,
  type EngineState,
} from "@/lib/reader-engine";
import type { ReadItem } from "@/lib/flatten";

/** Save progress every N items while playing, plus on pause and unmount. */
const SAVE_EVERY_ITEMS = 10;
/** Countdown refresh rate for the on-screen dwell timer. */
const DWELL_TICK_MS = 200;

export interface UseReaderEngineOptions {
  items: ReadItem[];
  wpm: number;
  autoPauseImages: boolean;
  initialIndex: number;
  /** Persist the current index. Called on pause, every 10 items, and unmount. */
  onSaveProgress: (index: number, wpm: number) => void;
}

export interface ReaderEngine {
  index: number;
  playing: boolean;
  /** ms left on the active dwell, 0 when not dwelling. */
  dwellRemainingMs: number;
  /** Total duration of the active dwell. */
  dwellMs: number;
  dwell: EngineState["dwell"];
  state: EngineState;
  togglePlay: () => void;
  step: (delta: number) => void;
  seek: (index: number) => void;
  resume: () => void;
  dispatch: (action: EngineAction) => void;
}

/**
 * Drives RSVP playback: the advance interval, the figure/formula dwell timer,
 * and periodic progress saves.
 *
 * The state transitions themselves live in the pure reducer
 * (`lib/reader-engine.ts`) so they can be tested without a DOM.
 */
export function useReaderEngine({
  items,
  wpm,
  autoPauseImages,
  initialIndex,
  onSaveProgress,
}: UseReaderEngineOptions): ReaderEngine {
  // The reducer closes over the current props. This is safe: React always
  // invokes the reducer from the latest render, so there is no stale closure
  // even though the function identity changes.
  const [state, dispatch] = useReducer(
    (current: EngineState, action: EngineAction) =>
      engineReducer(current, action, { items, autoPauseImages }),
    undefined,
    () => initialEngineState(initialIndex, items.length),
  );

  /* ---------------- persistence ---------------- */

  // Keep the callback in a ref so the save effects never re-run just because
  // the caller passed a new function identity.
  const saveRef = useRef(onSaveProgress);
  useEffect(() => {
    saveRef.current = onSaveProgress;
  });

  const lastSavedRef = useRef(initialIndex);
  const indexRef = useRef(state.index);
  const wpmRef = useRef(wpm);

  useEffect(() => {
    indexRef.current = state.index;
    wpmRef.current = wpm;
  });

  // Save on unmount (navigating away / closing the tab).
  useEffect(
    () => () => saveRef.current(indexRef.current, wpmRef.current),
    [],
  );

  // Periodic checkpoint while reading.
  useEffect(() => {
    if (Math.abs(state.index - lastSavedRef.current) < SAVE_EVERY_ITEMS) return;
    lastSavedRef.current = state.index;
    saveRef.current(state.index, wpm);
  }, [state.index, wpm]);

  // Save the moment playback stops, so a pause is never lost.
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (wasPlayingRef.current && !state.playing) {
      saveRef.current(state.index, wpm);
      lastSavedRef.current = state.index;
    }
    wasPlayingRef.current = state.playing;
  }, [state.playing, state.index, wpm]);

  /* ---------------- advance timer ---------------- */

  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(
      () => dispatch({ type: "advance" }),
      intervalMsForWpm(wpm),
    );
    return () => clearInterval(id);
  }, [state.playing, wpm]);

  /* ---------------- dwell timer ---------------- */

  const { dwell, dwellMs } = state;

  useEffect(() => {
    if (dwell === "none") return;

    const started = Date.now();
    const interval = setInterval(() => {
      dispatch({
        type: "set-remaining",
        ms: Math.max(0, dwellMs - (Date.now() - started)),
      });
    }, DWELL_TICK_MS);

    const timeout = setTimeout(() => dispatch({ type: "resume" }), dwellMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [dwell, dwellMs]);

  /* ---------------- actions ---------------- */

  const togglePlay = useCallback(() => dispatch({ type: "toggle-play" }), []);
  const resume = useCallback(() => dispatch({ type: "resume" }), []);
  const step = useCallback(
    (delta: number) => dispatch({ type: "step", delta }),
    [],
  );
  const seek = useCallback(
    (index: number) => dispatch({ type: "seek", index }),
    [],
  );

  return useMemo(
    () => ({
      index: state.index,
      playing: state.playing,
      dwell: state.dwell,
      dwellMs: state.dwellMs,
      dwellRemainingMs: state.remainingMs,
      state,
      togglePlay,
      step,
      seek,
      resume,
      dispatch,
    }),
    [state, togglePlay, step, seek, resume],
  );
}
