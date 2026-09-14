import { NextRequest, NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { chunkWords, tokenizeText } from "@/lib/tokenize";
import { prepareReadableText } from "@/lib/markdown";

const PROCESSOR_URL = process.env.PROCESSOR_URL;
const PROCESSOR_SECRET = process.env.PROCESSOR_SECRET;

type UploadSourceType = "pdf" | "docx" | "youtube" | "txt" | "text";

const PROCESSOR_TYPES: Record<UploadSourceType, string> = {
  pdf: "pdf",
  docx: "docx",
  youtube: "youtube",
  txt: "text",
  text: "text",
};

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function defaultTitle(
  sourceType: UploadSourceType,
  storagePath: string | undefined,
  youtubeUrl: string | undefined,
): string {
  if (sourceType === "youtube" && youtubeUrl) {
    const id = extractYouTubeId(youtubeUrl);
    if (id) return `YouTube – ${id}`;
  }
  if (storagePath) {
    const name = storagePath.split("/").pop() ?? "document";
    return name.replace(/\.[^.]+$/, "") || "Untitled";
  }
  return "Untitled";
}

/** Plain text / markdown never needs OCR — tokenize and persist in-process. */
async function processTextInline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  documentId: string,
  rawText: string,
  opts?: { forceMarkdown?: boolean },
): Promise<{ word_count: number }> {
  // Strip Markdown syntax when present so RSVP shows words, not **bold**
  const plain = prepareReadableText(rawText, opts?.forceMarkdown === true);
  // Unicode-aware tokenization (Hindi, Gujarati, etc. — not ASCII \w)
  const words = tokenizeText(plain);
  const paragraphs = chunkWords(words, 80);

  await supabase
    .from("content_blocks")
    .delete()
    .eq("document_id", documentId);

  if (paragraphs.length) {
    const rows = paragraphs.map((pWords, position) => ({
      document_id: documentId,
      position,
      type: "text",
      words: pWords,
    }));
    const { error: insertError } = await supabase
      .from("content_blocks")
      .insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      status: "ready",
      word_count: words.length,
      error_msg: null,
      progress_msg: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
  if (updateError) throw new Error(updateError.message);

  return { word_count: words.length };
}

async function markError(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  documentId: string,
  message: string,
) {
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

export async function POST(request: NextRequest) {
  let body: {
    source_type: UploadSourceType;
    storage_path?: string;
    youtube_url?: string;
    raw_text?: string;
    title?: string;
    format?: "text" | "markdown";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source_type, storage_path, youtube_url, raw_text, title, format } = body;
  const sourceType = PROCESSOR_TYPES[source_type];
  if (!sourceType) {
    return NextResponse.json(
      { error: "source_type must be pdf, docx, youtube, or txt" },
      { status: 400 },
    );
  }
  if ((source_type === "pdf" || source_type === "docx") && !storage_path) {
    return NextResponse.json(
      { error: "storage_path is required for file uploads" },
      { status: 400 },
    );
  }
  if (source_type === "youtube" && !youtube_url) {
    return NextResponse.json(
      { error: "youtube_url is required for youtube sources" },
      { status: 400 },
    );
  }
  if (
    (source_type === "txt" || source_type === "text") &&
    (!raw_text || !raw_text.trim())
  ) {
    return NextResponse.json(
      { error: "raw_text is required for text sources" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = nanoid(8);
  const resolvedTitle =
    title?.trim() || defaultTitle(source_type, storage_path, youtube_url);

  // Text sources: insert as processing, then finish inline (no OCR / no processor).
  const isText = sourceType === "text";

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      slug,
      title: resolvedTitle,
      source_type: sourceType,
      status: "processing",
      storage_path: storage_path ?? null,
      source_url: youtube_url ?? null,
    })
    .select("id, slug")
    .single();

  if (error || !doc) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create document" },
      { status: 500 },
    );
  }

  if (isText && raw_text) {
    try {
      const forceMarkdown =
        format === "markdown" ||
        (typeof title === "string" && /\.md$/i.test(title.trim()));
      await processTextInline(supabase, doc.id, raw_text, { forceMarkdown });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process text";
      await markError(supabase, doc.id, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json(
      { id: doc.id, slug: doc.slug, status: "ready" },
      { status: 201 },
    );
  }

  // PDF / DOCX / YouTube: hand off to the Python processor.
  after(async () => {
    if (!PROCESSOR_URL || !PROCESSOR_SECRET) {
      console.error("PROCESSOR_URL / PROCESSOR_SECRET not configured");
      await markError(
        supabase,
        doc.id,
        "Document processor is not configured. Set PROCESSOR_URL and PROCESSOR_SECRET.",
      );
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
          source_type: sourceType,
          title: resolvedTitle,
          storage_path,
          youtube_url,
          raw_text,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("processor returned", res.status, detail);
        await markError(
          supabase,
          doc.id,
          `Processor failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        );
      }
    } catch (err) {
      console.error("Failed to notify processor:", err);
      await markError(
        supabase,
        doc.id,
        err instanceof Error
          ? `Could not reach processor: ${err.message}`
          : "Could not reach processor",
      );
    }
  });

  return NextResponse.json(
    { id: doc.id, slug: doc.slug },
    { status: 201 },
  );
}
