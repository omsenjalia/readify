"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_THEME,
  FONT_DEFAULT_DESKTOP,
  FONT_DEFAULT_MOBILE,
  FONT_MAX,
  FONT_MIN,
  SMALL_VIEWPORT_QUERY,
  THEMES,
  THEME_CLASS,
  WPM_MAX,
  WPM_MIN,
  type ReaderPrefs,
  type Theme,
} from "@/lib/constants";
import { savePreferences } from "@/lib/preferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** Debounce before persisting reader settings to the database. */
const SAVE_DEBOUNCE_MS = 500;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asTheme(value: string | null | undefined): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}

/**
 * Paper (light) is the baseline (no class on <html>); dark→`.theme-ink` and
 * sepia→`.theme-sepia` are opt-in classes. Shared with the settings page so
 * the two can never drift.
 */
export function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("theme-ink", "theme-sepia");
  const cls = THEME_CLASS[theme];
  if (cls) root.classList.add(cls);
}

export interface UseReaderSettingsOptions {
  /** Server-loaded preferences; the client does not re-fetch these. */
  preferences: ReaderPrefs | null;
  initialWpm: number;
  /** Owner id when signed in; settings are only persisted for owners. */
  userId: string | null;
}

export interface ReaderSettings {
  wpm: number;
  setWpm: (value: number) => void;
  /** Nudge by a delta, clamped to the allowed range. */
  adjustWpm: (delta: number) => void;

  fontSize: number;
  setFontSize: (value: number) => void;

  theme: Theme;
  setTheme: (value: Theme) => void;

  showProgressBar: boolean;
  setShowProgressBar: (value: boolean) => void;

  highlightOrp: boolean;
  setHighlightOrp: (value: boolean) => void;

  autoPauseImages: boolean;
  setAutoPauseImages: (value: boolean) => void;
}

/**
 * Reader-scoped presentation settings: speed, font size, theme and the three
 * display toggles.
 *
 * Extracted from `Reader.tsx`, which held eight `useState` atoms and a
 * debounce effect for each. The initial values come from the server-rendered
 * `preferences` prop — the reader used to re-fetch them from Supabase on
 * mount, which duplicated work the page had already done and could race with
 * the values already on screen.
 */
export function useReaderSettings({
  preferences,
  initialWpm,
  userId,
}: UseReaderSettingsOptions): ReaderSettings {
  const isSmallViewport = useMediaQuery(SMALL_VIEWPORT_QUERY);

  const [wpm, setWpmState] = useState(() =>
    clamp(initialWpm ?? WPM_MAX, WPM_MIN, WPM_MAX),
  );
  const [fontOverride, setFontOverride] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>(() => asTheme(preferences?.theme));
  const [showProgressBar, setShowProgressBar] = useState(
    preferences?.show_progress_bar ?? true,
  );
  const [highlightOrp, setHighlightOrp] = useState(
    preferences?.highlight_orp ?? true,
  );
  const [autoPauseImages, setAutoPauseImages] = useState(
    preferences?.auto_pause_images ?? true,
  );

  // Default font is smaller on phones unless the user picks one explicitly.
  const fontSize = clamp(
    fontOverride ??
      preferences?.font_size ??
      (isSmallViewport ? FONT_DEFAULT_MOBILE : FONT_DEFAULT_DESKTOP),
    FONT_MIN,
    FONT_MAX,
  );

  const setWpm = useCallback((value: number) => {
    setWpmState(clamp(value, WPM_MIN, WPM_MAX));
  }, []);

  const adjustWpm = useCallback((delta: number) => {
    setWpmState((current) => clamp(current + delta, WPM_MIN, WPM_MAX));
  }, []);

  const setFontSize = useCallback((value: number) => {
    setFontOverride(clamp(value, FONT_MIN, FONT_MAX));
  }, []);

  /* ---------------- theme ---------------- */

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  /* ---------------- persistence ---------------- */

  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  });

  useEffect(() => {
    const owner = userIdRef.current;
    if (!owner) return;

    const id = setTimeout(() => {
      void savePreferences(owner, {
        default_wpm: wpm,
        font_size: fontSize,
        theme,
        show_progress_bar: showProgressBar,
        highlight_orp: highlightOrp,
        auto_pause_images: autoPauseImages,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [
    wpm,
    fontSize,
    theme,
    showProgressBar,
    highlightOrp,
    autoPauseImages,
  ]);

  return {
    wpm,
    setWpm,
    adjustWpm,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    showProgressBar,
    setShowProgressBar,
    highlightOrp,
    setHighlightOrp,
    autoPauseImages,
    setAutoPauseImages,
  };
}
