-- Dark-first redesign (cerebrium-style UI overhaul).
--
-- Dark is now the baseline theme across the app: :root tokens are dark and
-- `light` / `sepia` are opt-in classes. This migration:
--
--   1. Makes 'dark' the factory default for new preference rows.
--   2. Moves rows still sitting on the OLD factory default ('light') to the
--      new look. Anyone who explicitly prefers Light/Sepia can switch back
--      in Settings → Theme (one click, saves immediately).
--   3. Aligns the numeric factory defaults with the redesigned reader
--      (600 WPM warm-up speed, 44px stage font). Existing rows keep their
--      stored values — only defaults change.

alter table if exists public.reading_preferences
  alter column theme set default 'dark';

alter table if exists public.reading_preferences
  alter column default_wpm set default 600;

alter table if exists public.reading_preferences
  alter column font_size set default 44;

update public.reading_preferences
set theme = 'dark'
where theme = 'light';
