// Generated Database types for Readio.
//
// Hand-written to match the consolidated schema:
//   supabase/migrations/20260923160000_readio_consolidated_schema.sql
// Regenerate with:
//   npm run db:types   (after `npx supabase login`)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          user_id: string | null;
          slug: string;
          title: string;
          source_type: string;
          status: string;
          visibility: string;
          word_count: number;
          is_favorite: boolean;
          last_read_at: string | null;
          error_msg: string | null;
          progress_msg: string | null;
          storage_path: string | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          slug: string;
          title?: string;
          source_type: string;
          status?: string;
          visibility?: string;
          word_count?: number;
          is_favorite?: boolean;
          last_read_at?: string | null;
          error_msg?: string | null;
          progress_msg?: string | null;
          storage_path?: string | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          slug?: string;
          title?: string;
          source_type?: string;
          status?: string;
          visibility?: string;
          word_count?: number;
          is_favorite?: boolean;
          last_read_at?: string | null;
          error_msg?: string | null;
          progress_msg?: string | null;
          storage_path?: string | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_blocks: {
        Row: {
          id: string;
          document_id: string;
          position: number;
          type: string;
          words: string[] | null;
          image_url: string | null;
          needs_ocr: boolean | null;
          html: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          position: number;
          type: string;
          words?: string[] | null;
          image_url?: string | null;
          needs_ocr?: boolean | null;
          html?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          position?: number;
          type?: string;
          words?: string[] | null;
          image_url?: string | null;
          needs_ocr?: boolean | null;
          html?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_blocks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          document_id: string | null;
          word_index: number;
          wpm: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          document_id?: string | null;
          word_index?: number;
          wpm?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          document_id?: string | null;
          word_index?: number;
          wpm?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_sessions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_preferences: {
        Row: {
          user_id: string;
          default_wpm: number;
          font_size: number;
          theme: string;
          show_progress_bar: boolean;
          highlight_orp: boolean;
          auto_pause_images: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          default_wpm?: number;
          font_size?: number;
          theme?: string;
          show_progress_bar?: boolean;
          highlight_orp?: boolean;
          auto_pause_images?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          default_wpm?: number;
          font_size?: number;
          theme?: string;
          show_progress_bar?: boolean;
          highlight_orp?: boolean;
          auto_pause_images?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// `content_blocks.html` (editor formatting) is included above — see the
// consolidated schema for the full column list.

export default Database;