import { NextRequest, NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { chunkWords, tokenizeText } from "@/lib/tokenize";
import { prepareReadableText } from "@/lib/markdown";
import { defaultYouTubeTitle, extractYouTubeId } from "@/lib/youtube";
import { markDocumentError, notifyProcessor } from "@/lib/processor";

type ClientSourceType = "pdf" | "docx" | "youtube" | "txt" | "text";

/** Client-facing source type -> source type the Python processor expects. */
const PROCESSOR_TYPES: Record<ClientSourceType, string> = {
  pdf: "pdf",
  docx: "docx",
  youtube: "youtube",
  txt: "text",
  text: "text",
};

const VALID_SOURCE_TYPES = Object.keys(PROCESSOR_TYPES) as ClientSourceType[];

function isClientSourceType(value: unknown): value is ClientSourceType {
  return (
    typeof value === "string" &&
    (VALID_SOURCE_TYPES as string[]).includes(value)
  );
}

interface CreateDocumentBody {
  source_type?: unknown;
  storage_path?: unknown;
  youtube_url?: unknown;
  raw_text?: unknown;
  title?: unknown;
  format?: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function defaultTitle(
  sourceType: ClientSourceType,
  storagePath: string | undefined,
  youtubeUrl: string | undefined,
): string {
  if (sourceType === "youtube" && youtubeUrl) {
    return defaultYouTubeTitle(youtubeUrl);
  }
  if (storagePath) {
    const name = storagePath.split("/").pop() ?? "document";
    return name.replace(/\.[^.]+$/, "") || "Untitled";
  }
  return "Untitled";
}

/**
 * Plain text / Markdown never needs OCR: tokenize and persist in-process
 * instead of round-tripping through the Python processor.
 */
async function processTextInline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  rawText: string,
  opts?: { forceMarkdown?: boolean },
): Promise<number> {
  const plain = prepareReadableText(rawText, opts?.forceMarkdown === true);
  const words = tokenizeText(plain);
  const paragraphs = chunkWords(words, 80);

  await supabase.from("content_blocks").delete().eq("document_id", documentId);

  if (paragraphs.length) {
    const rows = paragraphs.map((paragraphWords, position) => ({
      document_id: documentId,
      position,
      type: "text" as const,
      words: paragraphWords,
    }));
    const { error } = await supabase.from("content_blocks").insert(rows);
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase
    .from("documents")
    .update({
      status: "ready",
      word_count: words.length,
      error_msg: null,
      progress_msg: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
  if (error) throw new Error(error.message);

  return words.length;
}

export async function POST(request: NextRequest) {
  let body: CreateDocumentBody;
  try {
    body = (await request.json()) as CreateDocumentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isClientSourceType(body.source_type)) {
    return NextResponse.json(
      { error: "source_type must be pdf, docx, youtube, or txt" },
      { status: 400 },
    );
  }
  const sourceType = body.source_type;
  const storagePath = asString(body.storage_path);
  const youtubeUrl = asString(body.youtube_url);
  const rawText = typeof body.raw_text === "string" ? body.raw_text : undefined;
  const title = asString(body.title);
  const format = body.format === "markdown" ? "markdown" : undefined;

  // --- validation -------------------------------------------------
  if ((sourceType === "pdf" || sourceType === "docx") && !storagePath) {
    return NextResponse.json(
      { error: "storage_path is required for file uploads" },
      { status: 400 },
    );
  }
  if (sourceType === "youtube" && !youtubeUrl) {
    return NextResponse.json(
      { error: "youtube_url is required for youtube sources" },
      { status: 400 },
    );
  }
  if (sourceType === "youtube" && !extractYouTubeId(youtubeUrl!)) {
    return NextResponse.json(
      { error: "Could not parse a YouTube video id from that URL" },
      { status: 400 },
    );
  }
  if (
    (sourceType === "txt" || sourceType === "text") &&
    (!rawText || !rawText.trim())
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
    title ?? defaultTitle(sourceType, storagePath, youtubeUrl);
  const processorType = PROCESSOR_TYPES[sourceType];

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      slug,
      title: resolvedTitle,
      source_type: processorType,
      status: "processing",
      storage_path: storagePath ?? null,
      source_url: youtubeUrl ?? null,
    })
    .select("id, slug")
    .single();

  if (error || !doc) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create document" },
      { status: 500 },
    );
  }

  // --- text: finish inline ---------------------------------------
  if (processorType === "text" && rawText) {
    const forceMarkdown =
      format === "markdown" || (title ? /\.md$/i.test(title) : false);
    try {
      await processTextInline(supabase, doc.id, rawText, { forceMarkdown });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process text";
      await markDocumentError(supabase, doc.id, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json(
      { id: doc.id, slug: doc.slug, status: "ready" },
      { status: 201 },
    );
  }

  // --- everything else: hand off to the processor ----------------
  after(async () => {
    const result = await notifyProcessor({
      document_id: doc.id,
      source_type: processorType,
      title: resolvedTitle,
      storage_path: storagePath,
      youtube_url: youtubeUrl,
      raw_text: rawText,
    });
    if (!result.ok) {
      await markDocumentError(supabase, doc.id, result.message);
    }
  });

  return NextResponse.json({ id: doc.id, slug: doc.slug }, { status: 201 });
}
