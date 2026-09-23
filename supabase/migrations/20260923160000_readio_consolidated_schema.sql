-- ReadIO — consolidated schema (the only migration file).
--
-- This single script is the union of every migration the app needs:
--
--   20260113120000_database_schema_and_rls                    (base tables, RLS, trigger)
--   20260913191431_add_progress_msg                           (documents.progress_msg)
--   20260913191800_documents_storage_bucket                   (private `documents` bucket)
--   20260913220000_add_needs_ocr                              (content_blocks.needs_ocr)
--   20260913220010_add_document_images_storage_policies       (owner read/delete on figures)
--   20260914090000_content_blocks_owner_write_and_storage_cleanup
--   20260914100000_storage_path_and_private_images            (storage_path/source_url, private figures)
--   20260919120000_dark_first_theme_defaults                  (wpm/font factory defaults; theme flip superseded below)
--   20260923120000_white_default_theme                        (theme default back to 'light')
--   20260923140000_content_blocks_html_and_editor_images      (editor HTML + figure uploads)
--   supabase/remaining_remote.sql                             (one-off remote fixups, fully subsumed)
--
-- Properties:
--   * **Idempotent** — every statement is safe to re-run (`if not exists`,
--     `create or replace`, `drop … if exists then create`, bucket upserts).
--     It converges a fresh database AND an already-migrated project to the
--     same final state.
--   * **Final state only** — superseded intermediate steps are not
--     replayed. In particular the one-time `theme = 'light' → 'dark'` row
--     flip from the dark-first era is omitted: the product is white-only
--     again, and re-running that UPDATE would silently re-dark users who
--     chose Light afterwards.
--
-- Apply with either:
--   * SQL Editor: paste this file and run it, or
--   * CLI: `npx supabase db push` (this is the only file under
--     `supabase/migrations/`).

-- =========================================================================
-- 1. Extensions
-- =========================================================================

create extension if not exists "pgcrypto";

-- =========================================================================
-- 2. Tables (final shape — on an existing project every column added over
--    time is re-asserted by the `alter table … if not exists` block below)
-- =========================================================================

-- Users are managed by Supabase Auth (auth.users).
-- This table stores app-level profile data.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz default now()
);

-- Documents — one row per uploaded/linked document.
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  slug         text unique not null,             -- short ID used in /c/[slug]
  title        text not null default 'Untitled',
  source_type  text not null,                    -- 'pdf' | 'docx' | 'youtube' | 'text'
  status       text not null default 'processing', -- 'processing' | 'ready' | 'error'
  visibility   text not null default 'private',    -- 'private' | 'public'
  word_count   int default 0,
  is_favorite  boolean not null default false,   -- starred documents
  last_read_at timestamptz,                      -- updated on reading session activity
  error_msg    text,
  progress_msg text,                             -- processor progress (e.g. "Running OCR…")
  storage_path text,                             -- path in the private `documents` bucket
  source_url   text,                             -- original URL when source_type = youtube
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Content blocks — ordered sequence of text or image chunks.
create table if not exists public.content_blocks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  position    int not null,                      -- ordering within document
  type        text not null,                     -- 'text' | 'image'
  -- for type='text': array of word strings (the RSVP stream)
  words       text[],
  -- for type='image': storage path / URL in the document-images bucket
  image_url   text,
  -- image blocks rendered from scanned/image-only PDF pages
  needs_ocr   boolean not null default false,
  -- sanitized block-level HTML preserving the original document's
  -- formatting (headings, emphasis, lists) for the /edit editor;
  -- null on legacy rows — the editor falls back to `words`
  html        text,
  created_at  timestamptz default now()
);

-- Reading sessions — tracks where each user left off per document.
create table if not exists public.reading_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  document_id    uuid references public.documents(id) on delete cascade,
  word_index     int not null default 0,
  wpm            int not null default 800,       -- default 800 WPM as shown in UI
  updated_at     timestamptz default now(),
  unique (user_id, document_id)
);

-- Reading preferences — per-user global settings.
-- Factory defaults match web PREFERENCE_DEFAULTS (600 WPM, 44px, light).
create table if not exists public.reading_preferences (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  default_wpm         int not null default 600,
  font_size           int not null default 44,
  theme               text not null default 'light',  -- column kept for data compatibility
  show_progress_bar   boolean not null default true,
  highlight_orp       boolean not null default true,
  auto_pause_images   boolean not null default true,
  updated_at          timestamptz default now()
);

-- Columns introduced after the first release: no-ops on a fresh database,
-- required on a project that ran only the original base schema.
alter table public.documents add column if not exists progress_msg text;
alter table public.documents add column if not exists storage_path text;
alter table public.documents add column if not exists source_url   text;
alter table public.content_blocks add column if not exists needs_ocr boolean not null default false;
alter table public.content_blocks add column if not exists html text;

comment on column public.documents.storage_path is
  'Path inside the private documents bucket (user_id/timestamp-filename).';
comment on column public.documents.source_url is
  'Original YouTube (or external) URL when source_type = youtube.';
comment on column public.content_blocks.html is
  'Sanitized block-level HTML for the editor (headings, emphasis, lists). Null for legacy blocks — fall back to words.';

-- =========================================================================
-- 3. Row Level Security — enable + final policy set
-- =========================================================================

alter table public.profiles           enable row level security;
alter table public.documents          enable row level security;
alter table public.content_blocks     enable row level security;
alter table public.reading_sessions   enable row level security;
alter table public.reading_preferences enable row level security;

-- profiles -----------------------------------------------------------------
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

-- documents ----------------------------------------------------------------
drop policy if exists "Owners can do anything" on public.documents;
create policy "Owners can do anything"
  on public.documents for all using (auth.uid() = user_id);
drop policy if exists "Anyone can read public documents" on public.documents;
create policy "Anyone can read public documents"
  on public.documents for select using (visibility = 'public');

-- content_blocks -----------------------------------------------------------
-- SELECT follows document access (owner, or anyone for public docs) …
drop policy if exists "Block access follows document access" on public.content_blocks;
create policy "Block access follows document access"
  on public.content_blocks for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = content_blocks.document_id
        and (d.user_id = auth.uid() or d.visibility = 'public')
    )
  );
-- … while INSERT/UPDATE/DELETE are owner-only. The processor writes with
-- the service_role key (bypasses RLS); the web app's inline text uploads
-- and the /edit autosave use the user's session.
drop policy if exists "Owners can insert content blocks" on public.content_blocks;
create policy "Owners can insert content blocks"
  on public.content_blocks for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = content_blocks.document_id
        and d.user_id = auth.uid()
    )
  );
drop policy if exists "Owners can update content blocks" on public.content_blocks;
create policy "Owners can update content blocks"
  on public.content_blocks for update
  using (
    exists (
      select 1 from public.documents d
      where d.id = content_blocks.document_id
        and d.user_id = auth.uid()
    )
  );
drop policy if exists "Owners can delete content blocks" on public.content_blocks;
create policy "Owners can delete content blocks"
  on public.content_blocks for delete
  using (
    exists (
      select 1 from public.documents d
      where d.id = content_blocks.document_id
        and d.user_id = auth.uid()
    )
  );

-- reading_sessions ---------------------------------------------------------
drop policy if exists "Users manage own sessions" on public.reading_sessions;
create policy "Users manage own sessions"
  on public.reading_sessions for all using (auth.uid() = user_id);

-- reading_preferences ------------------------------------------------------
drop policy if exists "Users manage own preferences" on public.reading_preferences;
create policy "Users manage own preferences"
  on public.reading_preferences for all using (auth.uid() = user_id);

-- =========================================================================
-- 4. Index
-- =========================================================================

create index if not exists content_blocks_document_id_position_idx
  on public.content_blocks (document_id, position);

-- =========================================================================
-- 5. Signup trigger
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 6. Storage buckets (final visibility: both PRIVATE)
-- =========================================================================

-- Extracted PDF pages / figures. Private: readers get short-lived signed
-- URLs minted server-side after an authorization check.
insert into storage.buckets (id, name, public)
values ('document-images', 'document-images', false)
on conflict (id) do update set public = excluded.public;

-- Original uploads (PDF/DOCX sources). Stored at {user_id}/{timestamp}-{name}.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = excluded.public;

-- Belt and braces for projects where the bucket rows predate this file
-- (the Storage API may also have toggled visibility out-of-band).
update storage.buckets set public = false where id = 'document-images';
update storage.buckets set public = false where id = 'documents';

-- =========================================================================
-- 7. Storage object policies
-- =========================================================================

-- `documents` bucket (original uploads) — owner-only.
drop policy if exists "Users can read own documents" on storage.objects;
create policy "Users can read own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own documents" on storage.objects;
create policy "Users can delete own documents"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- `document-images` bucket (extracted figures + editor uploads).
-- Paths are document-images/{document_id}/{key}.png.
--
-- SELECT #1: the owner can always list/read/delete their document's images
-- (web DELETE cleanup runs with the user's session).
drop policy if exists "Users can read own document images" on storage.objects;
create policy "Users can read own document images"
  on storage.objects for select
  using (
    bucket_id = 'document-images'
    and exists (
      select 1 from public.documents d
      where d.id::text = (storage.foldername(name))[1]
        and d.user_id = auth.uid()
    )
  );

-- SELECT #2: anyone allowed to read the parent document (public share)
-- may read — and thus sign — its images.
drop policy if exists "Document readers can read images" on storage.objects;
create policy "Document readers can read images"
  on storage.objects for select
  using (
    bucket_id = 'document-images'
    and exists (
      select 1 from public.documents d
      where d.id::text = (storage.foldername(name))[1]
        and (d.user_id = auth.uid() or d.visibility = 'public')
    )
  );

drop policy if exists "Users can delete own document images" on storage.objects;
create policy "Users can delete own document images"
  on storage.objects for delete
  using (
    bucket_id = 'document-images'
    and exists (
      select 1 from public.documents d
      where d.id::text = (storage.foldername(name))[1]
        and d.user_id = auth.uid()
    )
  );

-- INSERT: owners upload new figures from the /edit toolbar (extracted
-- figures were only ever written by the processor with service_role).
drop policy if exists "Users can upload own document images" on storage.objects;
create policy "Users can upload own document images"
  on storage.objects for insert
  with check (
    bucket_id = 'document-images'
    and exists (
      select 1 from public.documents d
      where d.id::text = (storage.foldername(name))[1]
        and d.user_id = auth.uid()
    )
  );

-- =========================================================================
-- 8. Factory defaults (converge projects that predate the redesign)
-- =========================================================================

alter table public.reading_preferences alter column default_wpm set default 600;
alter table public.reading_preferences alter column font_size   set default 44;
alter table public.reading_preferences alter column theme       set default 'light';
