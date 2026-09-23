import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { blocksToCanvasHtml } from "@/lib/editor";
import { signImageUrls } from "@/lib/images";
import type { ContentBlock, Document } from "@/types";
import DocumentEditor from "@/components/editor/DocumentEditor";

/**
 * /edit/[slug] — the Word-style editing canvas for an owned document.
 *
 * Middleware already bounces signed-out visitors to /login; the page then
 * enforces ownership itself (a public document's readers must not land
 * here). Content blocks are loaded once, images are signed server-side,
 * and the canvas HTML is assembled by `blocksToCanvasHtml` so existing
 * text renders exactly as the original document formatted it — stored
 * `html` for processed uploads, a paragraph per legacy block otherwise.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const doc = await getOwnedDocument((await params).slug);
  if (!doc) return {};
  return { title: `Edit — ${doc.title}` };
}

async function getOwnedDocument(slug: string): Promise<Document | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const doc = data as Document;
  return doc.user_id === user.id ? doc : null;
}

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getOwnedDocument(slug);
  if (!doc) notFound();

  const supabase = await createClient();
  const { data: blockRows } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("document_id", doc.id)
    .order("position", { ascending: true });

  const blocks = (blockRows ?? []) as ContentBlock[];
  const signed = await signImageUrls(
    supabase,
    blocks.map((b) => b.image_url),
  );
  const initialHtml = blocksToCanvasHtml(blocks, signed);

  return (
    <DocumentEditor
      document={{ id: doc.id, slug: doc.slug, title: doc.title }}
      initialHtml={initialHtml}
      initialWordCount={doc.word_count ?? 0}
    />
  );
}
