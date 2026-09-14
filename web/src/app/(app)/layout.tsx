import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

export default async function AppLayout(props: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "user@example.com";

  // Apply saved theme on every authenticated page so library/dashboard/settings
  // match the reader's preference (previously only Reader/Settings touched <html>).
  const { data: prefs } = await supabase
    .from("reading_preferences")
    .select("theme")
    .eq("user_id", user.id)
    .maybeSingle();
  const theme =
    prefs?.theme === "dark" || prefs?.theme === "sepia" ? prefs.theme : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {theme ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add(${JSON.stringify(theme)});`,
          }}
        />
      ) : null}
      <TopNav email={email} />
      <main className="flex-1 pb-20 md:pb-0">{props.children}</main>
      <BottomNav />
    </div>
  );
}
