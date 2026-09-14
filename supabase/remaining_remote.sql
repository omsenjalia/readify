-- Remaining migrations for project moowuloqirkdxxtsueap
-- (base schema + progress_msg already present; documents bucket created via API)

-- needs_ocr on content_blocks
alter table public.content_blocks
  add column if not exists needs_ocr boolean default false;

-- storage_path + source_url on documents
alter table public.documents
  add column if not exists storage_path text;
alter table public.documents
  add column if not exists source_url text;

comment on column public.documents.storage_path is
  'Path inside the private documents bucket (user_id/timestamp-filename).';
comment on column public.documents.source_url is
  'Original YouTube (or external) URL when source_type = youtube.';

-- document-images is private (also set via Storage API)
update storage.buckets set public = false where id = 'document-images';
update storage.buckets set public = false where id = 'documents';

-- Owner write on content_blocks (inline text uploads)
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

-- Private documents bucket policies
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

-- document-images: readers of parent doc can read (for signed URLs)
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
