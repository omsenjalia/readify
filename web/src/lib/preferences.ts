import { createClient } from "@/lib/supabase/client";
import type { ReadingPreferences } from "@/types";

export async function getPreferences(
  userId: string,
): Promise<ReadingPreferences | null> {
  const { data, error } = await createClient()
    .from("reading_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ReadingPreferences;
}

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
    // Matches the reader's existing "fire-and-forget" sync behavior.
    console.warn("Save preferences failed:", error);
  }
}