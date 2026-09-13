import { createClient } from "@/lib/supabase/client";

export function pctComplete(currentWord: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  return Math.min(100, Math.round((currentWord / totalWords) * 100));
}

export function wordsPerMinute(msSpent: number, wordsRead: number): number {
  if (msSpent <= 0) return 0;
  return Math.round((wordsRead / (msSpent / 60000)) * 10) / 10;
}

export function estimatedSeconds(totalWords: number, wpm: number): number {
  if (wpm <= 0 || totalWords <= 0) return 0;
  return Math.round((totalWords / wpm) * 60);
}

const LOCAL_PROGRESS_PREFIX = "readify:progress:";

export function localProgressKey(slug: string): string {
  return `${LOCAL_PROGRESS_PREFIX}${slug}`;
}

export function getLocalProgress(
  slug: string,
): { index: number; wpm: number } | null {
  try {
    const raw = localStorage.getItem(localProgressKey(slug));
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
  } catch {
    // localStorage may be unavailable (private mode, storage disabled).
  }
}

let clientRef: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!clientRef) clientRef = createClient();
  return clientRef;
}

export async function getRemoteProgress(
  documentId: string,
  userId: string,
): Promise<{ word_index: number; wpm: number } | null> {
  const { data, error } = await getClient()
    .from("reading_sessions")
    .select("word_index, wpm")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .maybeSingle();

  if (error || !data) return null;
  return { word_index: data.word_index, wpm: data.wpm };
}

export async function setRemoteProgress(
  documentId: string,
  userId: string,
  wordIndex: number,
  wpm: number,
): Promise<void> {
  const client = getClient();
  await Promise.all([
    client.from("reading_sessions").upsert(
      {
        user_id: userId,
        document_id: documentId,
        word_index: wordIndex,
        wpm,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,document_id" },
    ),
    client
      .from("documents")
      .update({ last_read_at: new Date().toISOString() })
      .eq("id", documentId),
  ]);
}