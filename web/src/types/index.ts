import type { Database } from "./supabase";
export type { Database } from "./supabase";

export type SourceType = "pdf" | "docx" | "youtube" | "text" | "image";

export type ProcessingStatus = "processing" | "ready" | "error";

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert =
  Database["public"]["Tables"]["documents"]["Insert"];
export type ContentBlock =
  Database["public"]["Tables"]["content_blocks"]["Row"];
export type ContentBlockInsert =
  Database["public"]["Tables"]["content_blocks"]["Insert"];
export type ReadingSession =
  Database["public"]["Tables"]["reading_sessions"]["Row"];
export type ReadingPreferences =
  Database["public"]["Tables"]["reading_preferences"]["Row"];

export type DocumentWithProgress = Document & {
  word_index?: number;
  wpm?: number;
};

export interface WordBlock {
  id: string;
  text: string;
  orpIndex: number;
}