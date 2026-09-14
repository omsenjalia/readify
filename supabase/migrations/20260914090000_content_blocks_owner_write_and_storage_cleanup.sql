-- Owner write access on content_blocks.
-- The processor uses the service_role key (bypasses RLS), but the Next.js
-- text path inserts blocks with the user's session. Without these policies
-- plain-text uploads fail with RLS errors and leave status=error.
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

-- Allow owners to delete their own source files from the private documents bucket
-- (web DELETE /api/documents/{id} currently only cleans document-images).
drop policy if exists "Users can delete own documents" on storage.objects;
create policy "Users can delete own documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
