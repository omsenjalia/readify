-- Flag image blocks that came from scanned/image-only PDF pages so the
-- Session-6 OCR pass knows which rendered pages still need text extraction.
alter table public.content_blocks
  add column if not exists needs_ocr boolean not null default false;