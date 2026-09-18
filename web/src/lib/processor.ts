/**
 * The private `documents` bucket holds the *source* files and the
 * `document-images` bucket holds pages/figures rendered from them. Both are
 * private; the reader hands out short-lived signed URLs.
 *
 * This module isolates the cross-process hand-off to the Python processor so
 * the upload route and the reprocess route cannot drift apart.
 */

import { createClient } from "@/lib/supabase/server";

/** A server-side Supabase client. */
type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/* ------------------------------------------------------------------ */
/* Enqueueing work on the Python processor                             */
/* ------------------------------------------------------------------ */

export interface ProcessorPayload {
  document_id: string;
  source_type: string;
  title: string;
  storage_path?: string | null;
  youtube_url?: string | null;
  raw_text?: string | null;
}

export const PROCESSOR_NOT_CONFIGURED =
  "Document processor is not configured. Set PROCESSOR_URL and PROCESSOR_SECRET.";

/**
 * POST a job to the Python processor.
 *
 * Never throws: the caller gets a discriminated result so it can record the
 * failure on the document row. Both the upload route and the reprocess route
 * previously inlined this plus four near-identical error-update blocks.
 */
export async function notifyProcessor(
  payload: ProcessorPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = process.env.PROCESSOR_URL;
  const secret = process.env.PROCESSOR_SECRET;

  if (!url || !secret) {
    console.error("PROCESSOR_URL / PROCESSOR_SECRET not configured");
    return { ok: false, message: PROCESSOR_NOT_CONFIGURED };
  }

  try {
    const res = await fetch(`${url}/api/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("processor returned", res.status, detail);
      return {
        ok: false,
        message: `Processor failed (${res.status})${
          detail ? `: ${detail.slice(0, 200)}` : ""
        }`,
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("Failed to notify processor:", err);
    return {
      ok: false,
      message: err instanceof Error
        ? `Could not reach processor: ${err.message}`
        : "Could not reach processor",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Document row state transitions                                      */
/* ------------------------------------------------------------------ */

/**
 * Record a failure on the document row. Best-effort: a storage/database blip
 * here must not mask the original error.
 */
export async function markDocumentError(
  supabase: ServerSupabase,
  documentId: string,
  message: string,
): Promise<void> {
  await supabase
    .from("documents")
    .update({
      status: "error",
      error_msg: message,
      progress_msg: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

/**
 * Flag a document as actively processing.
 *
 * Returns the Postgres error message on failure (or `null` on success) so the
 * caller can surface a 500 rather than queueing work that can never land.
 */
export async function markDocumentProcessing(
  supabase: ServerSupabase,
  documentId: string,
  progressMsg: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("documents")
    .update({
      status: "processing",
      error_msg: null,
      progress_msg: progressMsg,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  return error?.message ?? null;
}

