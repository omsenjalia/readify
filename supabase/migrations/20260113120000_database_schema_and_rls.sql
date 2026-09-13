-- Readify initial schema: profiles, documents, content_blocks,
-- reading_sessions, reading_preferences + RLS + storage bucket.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Users are managed by Supabase Auth (auth.users).
-- This table stores app-level profile data.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Function to create profile on signup (must exist before the trigger)
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

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

-- Documents table — one row per uploaded/linked document
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
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.documents enable row level security;

drop policy if exists "Owners can do anything" on public.documents;
create policy "Owners can do anything"
  on public.documents for all using (auth.uid() = user_id);
drop policy if exists "Anyone can read public documents" on public.documents;
create policy "Anyone can read public documents"
  on public.documents for select using (visibility = 'public');

-- Content blocks — ordered sequence of text or image chunks
create table if not exists public.content_blocks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  position    int not null,                      -- ordering within document
  type        text not null,                     -- 'text' | 'image'
  -- for type='text': array of word strings
  words       text[],
  -- for type='image': public URL in Supabase Storage
  image_url   text,
  created_at  timestamptz default now()
);
alter table public.content_blocks enable row level security;

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
create index if not exists content_blocks_document_id_position_idx
  on public.content_blocks (document_id, position);

-- Reading sessions — tracks where each user left off per document
create table if not exists public.reading_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  document_id    uuid references public.documents(id) on delete cascade,
  word_index     int not null default 0,
  wpm            int not null default 800,       -- default 800 WPM as shown in UI
  updated_at     timestamptz default now(),
  unique (user_id, document_id)
);
alter table public.reading_sessions enable row level security;

drop policy if exists "Users manage own sessions" on public.reading_sessions;
create policy "Users manage own sessions"
  on public.reading_sessions for all using (auth.uid() = user_id);

-- Reading preferences — per-user global settings
create table if not exists public.reading_preferences (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  default_wpm         int not null default 800,
  font_size           int not null default 48,
  theme               text not null default 'light',  -- 'light' | 'dark' | 'sepia'
  show_progress_bar   boolean not null default true,
  highlight_orp       boolean not null default true,
  auto_pause_images   boolean not null default true,
  updated_at          timestamptz default now()
);
alter table public.reading_preferences enable row level security;

drop policy if exists "Users manage own preferences" on public.reading_preferences;
create policy "Users manage own preferences"
  on public.reading_preferences for all using (auth.uid() = user_id);

-- Storage bucket for extracted PDF images.
-- Public: true (images are served directly in the reader).
insert into storage.buckets (id, name, public)
values ('document-images', 'document-images', true)
on conflict (id) do update set public = excluded.public;