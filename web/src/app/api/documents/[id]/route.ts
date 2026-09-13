import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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

  const { data: existing, error: fetchError } = await supabase
    .from("documents")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let body: { visibility?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: { visibility?: "private" | "public"; title?: string } = {};

  if (body.visibility !== undefined) {
    if (body.visibility !== "private" && body.visibility !== "public") {
      return NextResponse.json(
        { error: "visibility must be private or public" },
        { status: 400 },
      );
    }
    update.visibility = body.visibility;
  }

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    update.title = title;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .update(update)
    .eq("id", id)
    .select("id, slug, title, visibility, word_count")
    .single();

  if (error || !doc) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update document" },
      { status: 500 },
    );
  }

  return NextResponse.json(doc);
}