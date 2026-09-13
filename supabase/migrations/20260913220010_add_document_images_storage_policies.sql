-- Owners may list and delete the extracted images of their own documents
-- in the public `document-images` bucket. Images live at
-- document-images/{document_id}/{key}.png. Needed by the web API's
-- DELETE /api/documents/{id} cleanup step, which runs with the anon key.
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