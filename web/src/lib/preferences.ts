import { createClient } from "@/lib/supabase/client";
import type { ReadingPreferences } from "@/types";

/**
 * Persist preferences from the reader.
 *
 * Fire-and-forget by design: the reader saves on a debounce while the user
 * reads, so a failed write must not interrupt playback. Failures are logged.
 *
 * Reading preferences back is done by the server components that already need
 * them (`settings`, `c/[slug]`), so there is no browser-side getter here.
 */
export async function savePreferences(
  userId: string,
  prefs: Partial<ReadingPreferences>,
): Promise<void> {
  const { error } = await createClient().from("reading_preferences").upsert({
    user_id: userId,
    ...prefs,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("Save preferences failed:", error);
  }
}
