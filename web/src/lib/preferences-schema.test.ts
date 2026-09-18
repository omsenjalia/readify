import { describe, expect, it } from "vitest";
import {
  isEmptyPatch,
  sanitizePreferencePatch,
} from "@/lib/preferences-schema";
import { FONT_MAX, FONT_MIN, WPM_MAX, WPM_MIN } from "@/lib/constants";

describe("sanitizePreferencePatch", () => {
  it("keeps recognised, in-range fields", () => {
    expect(
      sanitizePreferencePatch({
        default_wpm: 400,
        font_size: 52,
        theme: "dark",
        highlight_orp: false,
      }),
    ).toEqual({
      default_wpm: 400,
      font_size: 52,
      theme: "dark",
      highlight_orp: false,
    });
  });

  it("drops unknown keys (no column injection)", () => {
    const patch = sanitizePreferencePatch({
      default_wpm: 300,
      user_id: "someone-else",
      is_admin: true,
      updated_at: "1970-01-01",
    });
    expect(patch).toEqual({ default_wpm: 300 });
    expect(patch).not.toHaveProperty("user_id");
    expect(patch).not.toHaveProperty("is_admin");
  });

  it("clamps numeric fields into range", () => {
    expect(sanitizePreferencePatch({ default_wpm: 99999 }).default_wpm).toBe(
      WPM_MAX,
    );
    expect(sanitizePreferencePatch({ default_wpm: -50 }).default_wpm).toBe(
      WPM_MIN,
    );
    expect(sanitizePreferencePatch({ font_size: 900 }).font_size).toBe(FONT_MAX);
    expect(sanitizePreferencePatch({ font_size: 1 }).font_size).toBe(FONT_MIN);
  });

  it("rejects non-numeric numbers", () => {
    expect(sanitizePreferencePatch({ default_wpm: "400" })).toEqual({});
    expect(sanitizePreferencePatch({ default_wpm: NaN })).toEqual({});
    expect(sanitizePreferencePatch({ default_wpm: Infinity })).toEqual({});
    expect(sanitizePreferencePatch({ font_size: null })).toEqual({});
  });

  it("rounds fractional numbers", () => {
    expect(sanitizePreferencePatch({ default_wpm: 401.7 }).default_wpm).toBe(
      402,
    );
  });

  it("only accepts known themes", () => {
    expect(sanitizePreferencePatch({ theme: "neon" })).toEqual({});
    expect(sanitizePreferencePatch({ theme: "sepia" })).toEqual({
      theme: "sepia",
    });
  });

  it("rejects non-boolean flags", () => {
    expect(sanitizePreferencePatch({ highlight_orp: "yes" })).toEqual({});
    expect(sanitizePreferencePatch({ show_progress_bar: 1 })).toEqual({});
    expect(sanitizePreferencePatch({ auto_pause_images: false })).toEqual({
      auto_pause_images: false,
    });
  });

  it("tolerates junk input without throwing", () => {
    expect(sanitizePreferencePatch(null)).toEqual({});
    expect(sanitizePreferencePatch(undefined)).toEqual({});
    expect(sanitizePreferencePatch("nope")).toEqual({});
    expect(sanitizePreferencePatch(42)).toEqual({});
    expect(sanitizePreferencePatch([])).toEqual({});
  });
});

describe("isEmptyPatch", () => {
  it("detects empty and non-empty patches", () => {
    expect(isEmptyPatch({})).toBe(true);
    expect(isEmptyPatch({ theme: "dark" })).toBe(false);
  });
});
