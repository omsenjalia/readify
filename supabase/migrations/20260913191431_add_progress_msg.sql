-- Add progress_msg column to documents for processor status updates
alter table public.documents add column if not exists progress_msg text;