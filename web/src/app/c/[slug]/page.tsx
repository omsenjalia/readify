import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDocumentBySlug } from "@/lib/documents";
import { flattenBlocks } from "@/lib/flatten";
import { PREFERENCE_DEFAULTS } from "@/lib/constants";
import { resolveImageUrl, signImageUrls } from "@/lib/images";
import type {
  ContentBlock,
  Document,
  ReadingPreferences,
} from "@/types";
import ReaderClient from "@/components/Reader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocumentBySlug(slug);
  if (!doc || doc.visibility !== "public") return {};

  return {
    title: `${doc.title} — Readify`,
    description: `Speed read "${doc.title}" — ${doc.word_count.toLocaleString()} words`,
    openGraph: {
      title: doc.title,
      description: `${doc.word_count.toLocaleString()} words · Read faster with Readify`,
      url: `https://readify.app/c/${doc.slug}`,
    },
  };
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!document) {
    notFound();
  }
  const doc = document as Document;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user && doc.user_id === user.id;
  const isSignedIn = !!user;

  if (doc.visibility === "private" && !isOwner) {
    notFound();
  }

  const { data: blockRows } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("document_id", doc.id)
    .order("position", { ascending: true });

  const rawBlocks = (blockRows ?? []) as ContentBlock[];
  const signed = await signImageUrls(
    supabase,
    rawBlocks.map((b) => b.image_url),
  );
  const items = flattenBlocks(rawBlocks).map((item) => {
    if (item.kind !== "image") return item;
    const url = resolveImageUrl(item.url, signed) ?? item.url;
    return { ...item, url };
  });

  let preferences: ReadingPreferences | null = null;
  let wordIndex: number | null = null;
  let sessionWpm: number | null = null;

  if (user) {
    const [{ data: prefs }, { data: session }] = await Promise.all([
      supabase
        .from("reading_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("reading_sessions")
        .select("word_index, wpm")
        .eq("user_id", user.id)
        .eq("document_id", doc.id)
        .maybeSingle(),
    ]);

    preferences = (prefs ?? null) as ReadingPreferences | null;
    wordIndex = session?.word_index ?? null;
    sessionWpm = session?.wpm ?? null;
  }

  const total = items.length;
  const initialIndex =
    wordIndex !== null && wordIndex >= 0 && wordIndex < total ? wordIndex : 0;
  const initialWpm =
    sessionWpm ?? preferences?.default_wpm ?? PREFERENCE_DEFAULTS.default_wpm;

  return (
    <ReaderClient
      document={doc}
      items={items}
      isOwner={isOwner}
      isSignedIn={isSignedIn}
      userId={user?.id ?? null}
      preferences={preferences}
      initialIndex={initialIndex}
      initialWpm={initialWpm}
    />
  );
}