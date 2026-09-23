import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_BUCKET } from "@/lib/constants";
import { validateEditorPayload } from "@/lib/editor";
import { toImagePath } from "@/lib/images";

/**
 * PUT /api/documents/[id]/content — the editor's autosave endpoint.
 *
 * Accepts the serialized canvas as structured blocks, sanitizes every text
 * block server-side and re-tokenizes words for the RSVP reader, replaces
 * the document's content_blocks rows and updates `word_count`. Figures
 * removed since the last save are pruned from storage (best effort).
 *
 * Replacement mirrors the processor's `persist_document`: validate
 * everything first, then delete, then insert — the client keeps the
 * document in its DOM and retries on failure, so a failed save never
 * destroys what the user is looking at.
 */

/** Rows per insert round-trip (keeps each statement comfortably small). */
const INSERT_CHUNK = 500;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: owned } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let body: { blocks?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateEditorPayload(body.blocks, id);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const blocks = validation.blocks;

  // Snapshot current image paths so removed figures can be pruned later.
  const { data: oldRows } = await supabase
    .from("content_blocks")
    .select("image_url")
    .eq("document_id", id);
  const oldPaths = new Set(
    (oldRows ?? [])
      .map((r) => toImagePath(r.image_url))
      .filter((p): p is string => !!p),
  );

  let wordCount = 0;
  const rows: Record<string, unknown>[] = blocks.map((block, position) => {
    if (block.type === "image") {
      return {
        document_id: id,
        position,
        type: "image",
        image_url: block.image_path,
        words: null,
        html: null,
        needs_ocr: false,
      };
    }
    wordCount += block.words.length;
    return {
      document_id: id,
      position,
      type: "text",
      words: block.words,
      html: block.html,
      image_url: null,
      needs_ocr: false,
    };
  });

  // If the `html` column migration hasn't landed yet, retry without it so
  // a save still succeeds (formatting is lost, content never is).
  const insertRows = async (withHtml: boolean) => {
    const payload = withHtml
      ? rows
      : rows.map((row) => {
          const rest = { ...row };
          delete rest.html;
          return rest;
        });
    for (let i = 0; i < payload.length; i += INSERT_CHUNK) {
      const chunk = payload.slice(i, i + INSERT_CHUNK);
      const { error } = await supabase.from("content_blocks").insert(chunk);
      if (error) throw new Error(error.message);
    }
  };

  const { error: deleteError } = await supabase
    .from("content_blocks")
    .delete()
    .eq("document_id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  try {
    await insertRows(true);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/html/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    try {
      await insertRows(false);
    } catch (retryErr) {
      const retryMessage =
        retryErr instanceof Error ? retryErr.message : String(retryErr);
      return NextResponse.json({ error: retryMessage }, { status: 500 });
    }
  }

  const savedAt = new Date().toISOString();
  const { error: docError } = await supabase
    .from("documents")
    .update({ word_count: wordCount, updated_at: savedAt })
    .eq("id", id)
    .eq("user_id", user.id);
  if (docError) {
    // Blocks landed; the count will catch up on the next save or reprocess.
    console.warn("editor save: word_count update failed", docError.message);
  }

  // Best-effort storage cleanup for figures the user removed or replaced.
  const keptPaths = new Set(
    blocks.flatMap((b) => (b.type === "image" ? [b.image_path] : [])),
  );
  const removed = [...oldPaths].filter((p) => !keptPaths.has(p));
  if (removed.length > 0) {
    try {
      await supabase.storage.from(IMAGE_BUCKET).remove(removed);
    } catch {
      // Orphaned figures are cleaned up when the document is deleted.
    }
  }

  return NextResponse.json({
    word_count: wordCount,
    block_count: blocks.length,
    saved_at: savedAt,
  });
}
