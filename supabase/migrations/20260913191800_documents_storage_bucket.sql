-- Private storage bucket for uploaded document source files.
-- Uploads are stored at {user_id}/{timestamp}-{filename}.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = excluded.public;

-- Owners can read back their own uploads (needed so the web API can
-- forward the file to the processor).
drop policy if exists "Users can read own documents" on storage.objects;
create policy "Users can read own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Owners can upload into their own folder.
drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);