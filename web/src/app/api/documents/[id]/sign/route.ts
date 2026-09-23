import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signImageUrls, toImagePath } from "@/lib/images";

/**
 * POST /api/documents/[id]/sign — mint signed URLs for this document's
 * figures. Used by the editor right after uploading a new image (the
 * bucket is private; every read URL must be issued server-side).
 *
 * Every requested path must live under `{documentId}/`, so ownership of
 * the document is ownership of the files.
 */
export async function POST(
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

  let body: { paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.paths) || body.paths.length === 0) {
    return NextResponse.json({ error: "paths must be a non-empty array" }, { status: 400 });
  }
  if (body.paths.length > 50) {
    return NextResponse.json({ error: "Too many paths (max 50)" }, { status: 400 });
  }

  const prefix = `${id}/`;
  const paths: string[] = [];
  for (const raw of body.paths) {
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "paths must be strings" }, { status: 400 });
    }
    const path = toImagePath(raw) ?? raw.trim();
    if (!path.startsWith(prefix) || path.includes("..") || path.length > 512) {
      return NextResponse.json(
        { error: "Path outside this document" },
        { status: 400 },
      );
    }
    paths.push(path);
  }

  const urls = await signImageUrls(supabase, paths);
  const out: Record<string, string> = {};
  for (const path of paths) {
    const url = urls.get(path);
    if (url) out[path] = url;
  }

  return NextResponse.json({ urls: out });
}
