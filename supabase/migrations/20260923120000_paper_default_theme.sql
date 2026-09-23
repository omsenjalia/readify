-- Paper-first: light is the baseline reading theme again.
--
-- 20260919120000 made 'dark' the default and migrated existing 'light'
-- rows to 'dark'. The Paper redesign flips the baseline back: the default
-- for NEW rows is 'light' (Paper). Existing rows are left untouched —
-- users who chose a theme keep it ('dark' now maps to the `.ink` class,
-- 'light' to the baseline, 'sepia' to `.sepia`).

alter table public.reading_preferences
  alter column theme set default 'light';
