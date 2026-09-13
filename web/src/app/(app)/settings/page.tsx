import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReadingPreferences } from "@/types";
import SettingsForm from "@/components/SettingsForm";

const DEFAULTS = {
  default_wpm: 800,
  font_size: 48,
  theme: "light",
  show_progress_bar: true,
  highlight_orp: true,
  auto_pause_images: true,
} as const satisfies Partial<ReadingPreferences>;

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("reading_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const preferences: ReadingPreferences = {
    user_id: user.id,
    ...DEFAULTS,
    ...(data ?? {}),
  };

  return <SettingsForm preferences={preferences} email={user.email ?? ""} />;
}