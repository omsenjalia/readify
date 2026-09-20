import type { Metadata } from "next";
import DemoReader from "./demo-reader";

export const metadata: Metadata = {
  title: "Try the reader",
  description:
    "Experience ReadIO's Line Flow reader — no account needed. The text slides beneath a fixed focus point while your eyes stay perfectly still.",
};

/**
 * Public reader playground: the full reader (Line Flow + classic RSVP,
 * gestures, settings, progress) on a built-in sample text, so anyone can
 * feel how it works before signing up.
 */
export default function DemoPage() {
  return <DemoReader />;
}
