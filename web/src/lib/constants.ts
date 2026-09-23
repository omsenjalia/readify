/**
 * Values that must agree across the web app (and, where noted, the backend).
 *
 * Anything previously copy-pasted between a Server Component, a Route Handler
 * and a client component belongs here so the three can never drift.
 */

/* ------------------------------------------------------------------ */
/* Supabase Storage buckets                                            */
/* ------------------------------------------------------------------ */

/** Private bucket holding files the user uploaded (PDF/DOCX sources). */
export const SOURCE_BUCKET = "documents";

/** Private bucket holding page renders / figures extracted from sources. */
export const IMAGE_BUCKET = "document-images";

/* ------------------------------------------------------------------ */
/* Reading preferences                                                 */
/* ------------------------------------------------------------------ */

/** Used by GET /api/preferences, the settings page and the reader. */
export const PREFERENCE_DEFAULTS = {
  default_wpm: 600,
  font_size: 44,
  theme: "light",
  show_progress_bar: true,
  highlight_orp: true,
  auto_pause_images: true,
} as const;

/**
 * The app is single-theme: white. The `theme` column still exists in the
 * database (older rows may hold "dark"/"sepia") but nothing renders a
 * different theme, and the preferences API only accepts "light".
 */
export const THEMES: readonly string[] = ["light"];

/** Minimal shape the reader needs; kept structural so it accepts rows. */
export interface ReaderPrefs {
  default_wpm?: number | null;
  font_size?: number | null;
  theme?: string | null;
  show_progress_bar?: boolean | null;
  highlight_orp?: boolean | null;
  auto_pause_images?: boolean | null;
}

/* ------------------------------------------------------------------ */
/* Reading modes                                                       */
/* ------------------------------------------------------------------ */

/**
 * How the reader presents text:
 *
 *  - `line` — Line Flow. The whole current line is visible and slides
 *    horizontally so the focused word stays centred for its entire duration.
 *    The eye never moves; the text does.
 *  - `word` — classic RSVP. One word at a time, ORP character locked to the
 *    centre axis, with dimmed previous/next word previews.
 */
export type ReadingMode = "line" | "word";
export const READING_MODES: readonly ReadingMode[] = ["line", "word"];
export const DEFAULT_READING_MODE: ReadingMode = "word";

/**
 * Line Flow packs words into display lines up to this fraction of the stage
 * width, leaving breathing room so the slide never looks wall-to-wall.
 */
export const LINE_FILL_RATIO = 0.92;

/** Longest Line Flow display line, in characters, when measuring fails. */
export const LINE_FALLBACK_CHARS = 46;

/* ------------------------------------------------------------------ */
/* Reader limits                                                       */
/* ------------------------------------------------------------------ */

export const WPM_MIN = 100;
export const WPM_MAX = 800;
export const WPM_STEP = 25;
export const WPM_PRESETS = [200, 400, 600, 800] as const;

export const FONT_MIN = 24;
export const FONT_MAX = 68;
export const FONT_STEP = 4;
/** Phones get a smaller default so lines still hold several words. */
export const FONT_DEFAULT_DESKTOP = 44;
export const FONT_DEFAULT_MOBILE = 32;

/** Breakpoint for the mobile reader layout (matches the Tailwind `sm`). */
export const SMALL_VIEWPORT_QUERY = "(max-width: 639px)";

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES_PER_UPLOAD = 5;

/** Extensions the uploader accepts on the client. */
export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".epub",
] as const;

/** Extensions the pipeline can actually turn into a readable document. */
export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

/**
 * Human-readable list of the formats that actually work, for UI copy.
 * Derived so the marketing text can never drift from the pipeline again
 * (the dashboard used to advertise EPUB, which the uploader rejects).
 */
export const SUPPORTED_FORMATS_LABEL = SUPPORTED_EXTENSIONS.map((ext) =>
  ext.slice(1).toUpperCase(),
).join(", ");
