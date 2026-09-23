import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { THEME_CLASS, type Theme } from "@/lib/constants";

export default async function AppLayout(props: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "user@example.com";

  const { data: prefs } = await supabase
    .from("reading_preferences")
    .select("theme")
    .eq("user_id", user.id)
    .maybeSingle();

  // Paper (light) is the baseline (no class); dark→`.ink` and sepia opt in
  // via a class applied before first paint so there is no theme flash.
  const themeClass = THEME_CLASS[prefs?.theme as Theme] ?? null;

  return (
    <>
      {themeClass ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add(${JSON.stringify(themeClass)});`,
          }}
        />
      ) : null}
      <AppShell email={email}>{props.children}</AppShell>
    </>
  );
}
