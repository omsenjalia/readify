import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const IMAGE_BUCKET = "document-images";
const SOURCE_BUCKET = "documents";

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

  const { data: owned } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, string | boolean> = {};
  if (typeof body.title === "string" && body.title.trim()) {
    updates.title = body.title.trim();
  }
  if (body.visibility === "public" || body.visibility === "private") {
    updates.visibility = body.visibility;
  }
  if (typeof body.is_favorite === "boolean") {
    updates.is_favorite = body.is_favorite;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update document" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
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

  const { data: owned } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Best-effort cleanup of extracted images + original upload.
  // Never fail the whole delete on storage blips — DB row is source of truth.
  try {
    const { data: objects } = await supabase.storage
      .from(IMAGE_BUCKET)
      .list(id, { limit: 1000, offset: 0 });
    if (objects && objects.length > 0) {
      const paths = objects.map((o) => `${id}/${o.name}`);
      await supabase.storage.from(IMAGE_BUCKET).remove(paths);
    }
  } catch {
    // ignore
  }

  if (owned.storage_path) {
    try {
      await supabase.storage.from(SOURCE_BUCKET).remove([owned.storage_path]);
    } catch {
      // ignore
    }
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}