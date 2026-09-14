import { redirect } from "next/navigation";

/** Alias matching the original product URL shape: /read/:slug */
export default async function ReadAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/c/${slug}`);
}
