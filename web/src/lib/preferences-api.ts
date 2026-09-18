/**
 * Browser-side wrapper for `/api/preferences`.
 *
 * `SettingsForm` used to inline the fetch and only look at `res.ok`, so the
 * server's validation message ("No recognised preference fields to update")
 * never reached the user. This returns a discriminated result instead.
 */

import type { PreferencePatch } from "@/lib/preferences-schema";

export type SaveResult = { ok: true } | { ok: false; error?: string };

export async function updatePreferences(
  patch: PreferencePatch,
): Promise<SaveResult> {
  try {
    const res = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (res.ok) return { ok: true };

    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    return { ok: false, error: body?.error };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : undefined,
    };
  }
}
