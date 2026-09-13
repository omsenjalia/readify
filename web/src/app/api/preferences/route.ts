import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReadingPreferences } from "@/types";

const DEFAULTS = {
  default_wpm: 800,
  font_size: 48,
  theme: "light",
  show_progress_bar: true,
  highlight_orp: true,
  auto_pause_images: true,
} as const satisfies Partial<ReadingPreferences>;

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
    return NextResponse.json({ error: "Preferences not found" }, { status: 404 });
  }

  return NextResponse.json(data ?? { ...DEFAULTS, user_id: user.id });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ReadingPreferences>;

  const { error } = await supabase.from("reading_preferences").upsert(
    {
      user_id: user.id,
      ...body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}