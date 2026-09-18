import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReadingPreferences } from "@/types";
import { PREFERENCE_DEFAULTS } from "@/lib/constants";
import SettingsForm from "@/components/SettingsForm";

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

  // Column defaults win over the shared baseline, which wins over nothing.
  const preferences: ReadingPreferences = {
    user_id: user.id,
    ...PREFERENCE_DEFAULTS,
    ...(data ?? {}),
  };

  return <SettingsForm preferences={preferences} email={user.email ?? ""} />;
}