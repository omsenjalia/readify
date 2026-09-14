-- Persist source location so deletes can clean up the private documents bucket,
-- and harden extracted images (no longer world-readable by bare URL).

alter table public.documents
  add column if not exists storage_path text;

alter table public.documents
  add column if not exists source_url text;

comment on column public.documents.storage_path is
  'Path inside the private documents bucket (user_id/timestamp-filename).';
comment on column public.documents.source_url is
  'Original YouTube (or external) URL when source_type = youtube.';

-- Private bucket: objects only reachable via signed URLs or authorized select.
update storage.buckets
  set public = false
  where id = 'document-images';

-- Anyone who can read the parent document may read (and thus sign) its images.
-- Paths are document-images/{document_id}/{key}.png
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

-- Service role (processor) bypasses RLS for uploads; owners already have
-- delete policies from 20260913220010.
