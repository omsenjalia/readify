import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

export function pctComplete(currentWord: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  return Math.min(100, Math.round((currentWord / totalWords) * 100));
}

/* ------------------------------------------------------------------ */
/* Local (signed-out) progress                                         */
/* ------------------------------------------------------------------ */

const LOCAL_PROGRESS_PREFIX = "readio:progress:";
const LEGACY_PROGRESS_PREFIX = "readify:progress:";

function localProgressKey(slug: string): string {
  return `${LOCAL_PROGRESS_PREFIX}${slug}`;
}

/**
 * Notify `useSyncExternalStore` consumers when local progress changes.
 *
 * `storage` fires for other tabs; the custom event covers this one, since a
 * same-tab `localStorage.setItem` emits nothing.
 */
export const LOCAL_PROGRESS_EVENT = "readio:local-progress";

export function subscribeToLocalProgress(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_PROGRESS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_PROGRESS_EVENT, onChange);
  };
}

export function getLocalProgress(
  slug: string,
): { index: number; wpm: number } | null {
  try {
    const raw =
      localStorage.getItem(localProgressKey(slug)) ??
      localStorage.getItem(`${LEGACY_PROGRESS_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { index?: number; wpm?: number };
    return {
      index: typeof parsed.index === "number" ? parsed.index : 0,
      wpm: typeof parsed.wpm === "number" ? parsed.wpm : 800,
    };
  } catch {
    return null;
  }
}

export function setLocalProgress(
  slug: string,
  index: number,
  wpm: number,
): void {
  try {
    localStorage.setItem(localProgressKey(slug), JSON.stringify({ index, wpm }));
    window.dispatchEvent(new Event(LOCAL_PROGRESS_EVENT));
  } catch {
    // localStorage may be unavailable (private mode, storage disabled).
  }
}

/* ------------------------------------------------------------------ */
/* Remote (signed-in) progress                                         */
/* ------------------------------------------------------------------ */

// `createBrowserClient` from @supabase/ssr already memoises a singleton in the
// browser, so no local cache is needed here (there used to be one per module).
//
// Reading progress back happens in the server components that need it
// (`library`, `stats`, `c/[slug]`) rather than in the browser.
export async function setRemoteProgress(
  documentId: string,
  userId: string,
  wordIndex: number,
  wpm: number,
): Promise<void> {
  const client = createClient();
  const now = new Date().toISOString();

  await Promise.all([
    client.from("reading_sessions").upsert(
      {
        user_id: userId,
        document_id: documentId,
        word_index: wordIndex,
        wpm,
        updated_at: now,
      },
      { onConflict: "user_id,document_id" },
    ),
    client.from("documents").update({ last_read_at: now }).eq("id", documentId),
  ]);
}
