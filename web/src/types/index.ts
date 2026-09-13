export type SourceType = "pdf" | "docx" | "youtube" | "text" | "image";

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface WordBlock {
  id: string;
  text: string;
  orpIndex: number;
}

export interface DocumentRecord {
  id: string;
  slug: string;
  title: string;
  source_type: SourceType;
  status: ProcessingStatus;
  word_count: number;
  created_at: string;
}

export interface ReadingSession {
  id: string;
  document_id: string;
  wpm: number;
  progress: number;
  last_word_index: number;
  updated_at: string;
}

export interface UserPreferences {
  wpm: number;
  font_size: number;
  theme: string;
}