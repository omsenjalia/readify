import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PREFERENCE_DEFAULTS } from "@/lib/constants";
import {
  isEmptyPatch,
  sanitizePreferencePatch,
} from "@/lib/preferences-schema";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("reading_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Preferences not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(data ?? { ...PREFERENCE_DEFAULTS, user_id: user.id });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = sanitizePreferencePatch(raw);
  if (isEmptyPatch(patch)) {
    return NextResponse.json(
      { error: "No recognised preference fields to update" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("reading_preferences").upsert(
    {
      user_id: user.id,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
