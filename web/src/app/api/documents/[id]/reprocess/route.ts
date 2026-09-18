import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  markDocumentError,
  markDocumentProcessing,
  notifyProcessor,
} from "@/lib/processor";

/**
 * Re-queue a failed (or any non-ready) document for processing.
 * Uses the stored storage_path / source_url so the user does not re-upload.
 */
export async function POST(
  _request: NextRequest,
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

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, slug, title, source_type, status, storage_path, source_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // --- guard rails: what can actually be reprocessed? -------------
  if (doc.source_type === "text") {
    return NextResponse.json(
      {
        error:
          "Plain-text documents are processed inline and cannot be reprocessed. Delete and paste again if needed.",
      },
      { status: 400 },
    );
  }
  if (doc.source_type === "youtube" && !doc.source_url) {
    return NextResponse.json(
      { error: "No YouTube URL stored on this document" },
      { status: 400 },
    );
  }
  if (
    (doc.source_type === "pdf" || doc.source_type === "docx") &&
    !doc.storage_path
  ) {
    return NextResponse.json(
      {
        error:
          "No source file path stored (document was uploaded before storage_path existed). Please re-upload the file.",
      },
      { status: 400 },
    );
  }

  const resetError = await markDocumentProcessing(supabase, id, "Reprocessing…");
  if (resetError) {
    return NextResponse.json({ error: resetError }, { status: 500 });
  }

  after(async () => {
    const result = await notifyProcessor({
      document_id: doc.id,
      source_type: doc.source_type,
      title: doc.title,
      storage_path: doc.storage_path,
      youtube_url: doc.source_url,
    });
    if (!result.ok) {
      await markDocumentError(supabase, doc.id, result.message);
    }
  });

  return NextResponse.json({
    id: doc.id,
    slug: doc.slug,
    status: "processing",
  });
}
