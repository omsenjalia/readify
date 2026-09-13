import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DocumentWithProgress } from "@/types";
import LibraryTable from "@/components/LibraryTable";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: docRows }, { data: sessionRows }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reading_sessions")
      .select("document_id, word_index, wpm, updated_at")
      .eq("user_id", user.id),
  ]);

  const sessions = new Map(
    (sessionRows ?? []).map((s) => [s.document_id, s]),
  );

  const documents: DocumentWithProgress[] = (docRows ?? []).map((doc) => {
    const session = sessions.get(doc.id);
    return {
      ...doc,
      word_index: session?.word_index,
      wpm: session?.wpm,
      last_session_at: session?.updated_at,
    };
  });

  return <LibraryTable documents={documents} />;
}