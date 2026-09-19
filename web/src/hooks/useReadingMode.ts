"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ReadingMode } from "@/lib/constants";
import {
  getReaderMode,
  serverReaderMode,
  setReaderMode,
  subscribeToReaderMode,
} from "@/lib/reader-mode";

/**
 * Line Flow vs classic RSVP, stored per-device in localStorage.
 *
 * `useSyncExternalStore` (rather than state + effect) keeps the first client
 * render identical to the server render — the reader mounts showing the
 * shared default and flips to the stored choice without a hydration warning.
 */
export function useReadingMode(): [ReadingMode, (mode: ReadingMode) => void] {
  const mode = useSyncExternalStore(
    subscribeToReaderMode,
    getReaderMode,
    serverReaderMode,
  );

  const setMode = useCallback((next: ReadingMode) => {
    setReaderMode(next);
  }, []);

  return [mode, setMode];
}
