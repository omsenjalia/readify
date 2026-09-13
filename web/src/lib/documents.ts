import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types";

export async function getDocumentBySlug(
  slug: string,
): Promise<Document | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as Document;
}