"use client";

import { useMemo } from "react";
import ReaderClient from "@/components/Reader";
import { tokenizeText } from "@/lib/tokenize";
import type { ReadItem } from "@/lib/flatten";

const SAMPLE_TITLE = "How Line Flow works";

const SAMPLE_TEXT = `
Speed reading has a dirty secret: your eyes do most of the work. On a normal
page they jump five to seven times per line, pause, refocus, and drift back to
re-read words you already saw. Those jumps, called saccades, burn time and
attention without adding a single word of comprehension.

Readio removes the movement entirely. Instead of asking you to scan a page,
it brings the text to one fixed point on your screen. In Line Flow mode the
whole line stays visible for context, sliding smoothly sideways so the key
character of each word, the Optimal Recognition Point, arrives exactly where
your gaze is already resting.

That pivot never moves. Your eyes never move. Only the sentence does.

The result feels less like reading and more like listening: a steady rhythm
of meaning arriving at the speed you choose, from a calm two hundred words
per minute up to a sprinting eight hundred. Figures pause themselves.
Formulas get extra time. Your place is saved to the word, on every device.

Everything you are experiencing right now is the real reader. Switch to the
one-word mode below, change the speed, resize the window, or open this page
on your phone and try the swipe gestures. When you are ready, sign up free
and point Readio at your own PDFs, documents, notes, and YouTube transcripts.
`;

const DEMO_DOC = {
  id: "demo",
  slug: "demo",
  title: SAMPLE_TITLE,
  visibility: "public",
  user_id: null,
};

export default function DemoReader() {
  const items = useMemo<ReadItem[]>(
    () =>
      tokenizeText(SAMPLE_TEXT).map((text) => ({
        kind: "word" as const,
        text,
      })),
    [],
  );

  return (
    <ReaderClient
      document={DEMO_DOC}
      items={items}
      isOwner={false}
      isSignedIn={false}
      userId={null}
      preferences={null}
      initialIndex={0}
      initialWpm={300}
    />
  );
}
