/**
 * Presentation helpers shared by the library, stats and dashboard views.
 *
 * `timeAgo` used to exist as two byte-identical copies (LibraryTable and the
 * stats page); the document badges existed as three divergent copies.
 */

/**
 * Human-readable relative time. Returns an en-dash for missing/invalid input
 * so tables keep their column alignment.
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "–";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "–";

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${plural(hours)} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${plural(days)} ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${plural(months)} ago`;

  const years = Math.round(months / 12);
  return `${years} year${plural(years)} ago`;
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

/** Format a byte count for the file picker. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
