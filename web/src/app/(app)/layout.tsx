import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

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

  // Dark is the baseline (no class); light/sepia opt in via a class applied
  // before first paint so there is no theme flash.
  const theme =
    prefs?.theme === "light" || prefs?.theme === "sepia" ? prefs.theme : null;

  return (
    <>
      {theme ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add(${JSON.stringify(theme)});`,
          }}
        />
      ) : null}
      <AppShell email={email}>{props.children}</AppShell>
    </>
  );
}
