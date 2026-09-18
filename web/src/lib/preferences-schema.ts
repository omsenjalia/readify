/**
 * Validation for the reading-preferences columns.
 *
 * PATCH /api/preferences used to spread the raw request body straight into an
 * upsert, so a client could send any key and any value (including `user_id`,
 * out-of-range numbers or non-boolean flags). This module is the single
 * whitelist + range check shared by the API route and the settings UI.
 */

import { FONT_MAX, FONT_MIN, THEMES, WPM_MAX, WPM_MIN } from "@/lib/constants";

export interface PreferencePatch {
  default_wpm?: number;
  font_size?: number;
  theme?: string;
  show_progress_bar?: boolean;
  highlight_orp?: boolean;
  auto_pause_images?: boolean;
}

const BOOLEAN_KEYS = [
  "show_progress_bar",
  "highlight_orp",
  "auto_pause_images",
] as const;

function clampInt(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Keep only recognised keys with in-range values.
 *
 * Unknown keys are dropped rather than rejected so an older client sending a
 * since-removed field does not break the whole save.
 */
export function sanitizePreferencePatch(
  input: unknown,
): PreferencePatch {
  if (typeof input !== "object" || input === null) return {};
  const body = input as Record<string, unknown>;
  const out: PreferencePatch = {};

  const wpm = clampInt(body.default_wpm, WPM_MIN, WPM_MAX);
  if (wpm !== undefined) out.default_wpm = wpm;

  const fontSize = clampInt(body.font_size, FONT_MIN, FONT_MAX);
  if (fontSize !== undefined) out.font_size = fontSize;

  if (typeof body.theme === "string" && THEMES.includes(body.theme as never)) {
    out.theme = body.theme;
  }

  for (const key of BOOLEAN_KEYS) {
    if (typeof body[key] === "boolean") out[key] = body[key];
  }

  return out;
}

/** True when a patch carries nothing to persist. */
export function isEmptyPatch(patch: PreferencePatch): boolean {
  return Object.keys(patch).length === 0;
}
