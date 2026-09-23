-- White is the single theme.
--
-- The reader no longer renders dark or sepia; the `theme` column is kept for
-- data compatibility (older rows may hold 'dark'/'sepia') but its default is
-- flipped to 'light' so new rows match the only theme that exists.

alter table public.reading_preferences
  alter column theme set default 'light';
