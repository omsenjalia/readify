/**
 * YouTube URL parsing — one implementation for the whole web app.
 *
 * Previously copy-pasted (and subtly different) in `app/api/documents/route.ts`
 * and `app/(app)/upload/page.tsx`. The backend has its own parser in
 * `backend/services/youtube_service.py`; that one is deliberately separate
 * because it runs in a different process and language, but it accepts the
 * same URL shapes.
 */

const VIDEO_ID = "[\\w-]{11}";

/**
 * Ordered patterns, most specific first. `watch?v=` handles both a leading
 * query (`?v=`) and `v=` appearing after other parameters (`?t=1&v=`).
 */
const PATTERNS: readonly RegExp[] = [
  new RegExp(`youtube\\.com/watch\\?(?:.*&)?v=(${VIDEO_ID})`),
  new RegExp(`youtu\\.be/(${VIDEO_ID})`),
  new RegExp(`youtube\\.com/embed/(${VIDEO_ID})`),
  new RegExp(`youtube\\.com/shorts/(${VIDEO_ID})`),
  new RegExp(`youtube\\.com/live/(${VIDEO_ID})`),
];

/** Extract an 11-character video id from any common YouTube URL shape. */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Display title used when the user does not supply one. */
export function defaultYouTubeTitle(url: string): string {
  const id = extractYouTubeId(url);
  return id ? `YouTube – ${id}` : "Untitled";
}
