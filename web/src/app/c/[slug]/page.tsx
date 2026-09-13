export default async function ReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // TODO: load document by slug, flatten blocks, render RSVP reader
  // with ORP-highlighted words driven by user wpm preference.
  return null;
}