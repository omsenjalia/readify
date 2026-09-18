import type { Database } from "./supabase";

export type { Database } from "./supabase";

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type ContentBlock =
  Database["public"]["Tables"]["content_blocks"]["Row"];
export type ReadingPreferences =
  Database["public"]["Tables"]["reading_preferences"]["Row"];

/**
 * The `documents.status` check constraint.
 *
 * The generated Supabase types widen this column to `string`, so anything
 * arriving from the database or over the wire has to be narrowed with
 * {@link toProcessingStatus} before the UI can switch on it exhaustively.
 */
export const PROCESSING_STATUSES = ["processing", "ready", "error"] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export function toProcessingStatus(
  value: unknown,
  fallback: ProcessingStatus = "processing",
): ProcessingStatus {
  return typeof value === "string" &&
    (PROCESSING_STATUSES as readonly string[]).includes(value)
    ? (value as ProcessingStatus)
    : fallback;
}

/** A document row joined with the reader's saved position, for the library. */
export type DocumentWithProgress = Document & {
  word_index?: number;
  wpm?: number;
  last_session_at?: string;
};
