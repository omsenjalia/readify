import type { SupabaseClient } from "@supabase/supabase-js";

import { IMAGE_BUCKET } from "@/lib/constants";

/** Signed URL lifetime: long enough for a reading session + public share. */
const SIGN_SECONDS = 60 * 60 * 6; // 6 hours

/**
 * Normalize a stored image reference to a storage object path.
 * Accepts:
 *   - relative path: `{documentId}/{key}.png` (new)
 *   - legacy public URL: `https://…/storage/v1/object/public/document-images/…`
 *   - legacy signed URL or path with bucket prefix
 */
export function toImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const raw = imageUrl.trim();
  if (!raw) return null;

  // Already a relative path (no scheme)
  if (!raw.includes("://")) {
    return raw.replace(/^\/+/, "").replace(/^document-images\//, "");
  }

  // Public or signed object URL
  const markers = [
    `/object/public/${IMAGE_BUCKET}/`,
    `/object/sign/${IMAGE_BUCKET}/`,
    `/object/authenticated/${IMAGE_BUCKET}/`,
  ];
  for (const m of markers) {
    const idx = raw.indexOf(m);
    if (idx >= 0) {
      let path = raw.slice(idx + m.length);
      // Strip query string from signed URLs
      const q = path.indexOf("?");
      if (q >= 0) path = path.slice(0, q);
      return decodeURIComponent(path);
    }
  }

  return null;
}

/**
 * Issue short-lived signed URLs for every image block the caller is allowed
 * to see. Safe for private and public documents — only the app that already
 * authorized document access can produce these.
 */
export async function signImageUrls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  imageRefs: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const paths = [
    ...new Set(
      imageRefs
        .map(toImagePath)
        .filter((p): p is string => typeof p === "string" && p.length > 0),
    ),
  ];
  const out = new Map<string, string>();
  if (paths.length === 0) return out;

  // createSignedUrls is batch; fall back per-path if the client is older.
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(paths, SIGN_SECONDS);

  if (!error && data) {
    for (const row of data) {
      if (row.path && row.signedUrl) {
        out.set(row.path, row.signedUrl);
        // Also key by original relative form
        out.set(row.path.replace(/^\//, ""), row.signedUrl);
      }
    }
  }

  // Ensure every path has an entry even if batch partially failed
  await Promise.all(
    paths
      .filter((p) => !out.has(p))
      .map(async (path) => {
        const { data: one } = await supabase.storage
          .from(IMAGE_BUCKET)
          .createSignedUrl(path, SIGN_SECONDS);
        if (one?.signedUrl) out.set(path, one.signedUrl);
      }),
  );

  return out;
}

export function resolveImageUrl(
  imageUrl: string | null | undefined,
  signed: Map<string, string>,
): string | null {
  if (!imageUrl) return null;
  // Legacy absolute public URL still works until bucket is private; prefer signed.
  const path = toImagePath(imageUrl);
  if (path && signed.has(path)) return signed.get(path)!;
  if (imageUrl.includes("://")) return imageUrl;
  return null;
}
