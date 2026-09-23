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

  // Single white theme — no theme class, no flash, no plumbing.
  return <AppShell email={email}>{props.children}</AppShell>;
}
