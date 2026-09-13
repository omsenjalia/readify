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

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav email={email} />
      <main className="flex-1 pb-20 md:pb-0">
        {props.children}
      </main>
      <BottomNav />
    </div>
  );
}