import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROCESSOR_URL = process.env.PROCESSOR_URL;
const PROCESSOR_SECRET = process.env.PROCESSOR_SECRET;

/**
 * Re-queue a failed (or any non-ready) document for processing.
 * Uses stored storage_path / source_url so the user does not re-upload.
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
    .select(
      "id, slug, title, source_type, status, storage_path, source_url",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

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

  const { error: resetError } = await supabase
    .from("documents")
    .update({
      status: "processing",
      error_msg: null,
      progress_msg: "Reprocessing…",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (resetError) {
    return NextResponse.json(
      { error: resetError.message },
      { status: 500 },
    );
  }

  after(async () => {
    if (!PROCESSOR_URL || !PROCESSOR_SECRET) {
      await supabase
        .from("documents")
        .update({
          status: "error",
          error_msg:
            "Document processor is not configured. Set PROCESSOR_URL and PROCESSOR_SECRET.",
          progress_msg: null,
        })
        .eq("id", id);
      return;
    }
    try {
      const res = await fetch(`${PROCESSOR_URL}/api/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PROCESSOR_SECRET}`,
        },
        body: JSON.stringify({
          document_id: doc.id,
          source_type: doc.source_type,
          title: doc.title,
          storage_path: doc.storage_path,
          youtube_url: doc.source_url,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        await supabase
          .from("documents")
          .update({
            status: "error",
            error_msg: `Processor failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
            progress_msg: null,
          })
          .eq("id", id);
      }
    } catch (err) {
      await supabase
        .from("documents")
        .update({
          status: "error",
          error_msg:
            err instanceof Error
              ? `Could not reach processor: ${err.message}`
              : "Could not reach processor",
          progress_msg: null,
        })
        .eq("id", id);
    }
  });

  return NextResponse.json({
    id: doc.id,
    slug: doc.slug,
    status: "processing",
  });
}
