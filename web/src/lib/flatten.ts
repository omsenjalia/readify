import type { ContentBlock } from "@/types";

export type ReadItem =
  | { kind: "word"; text: string }
  | { kind: "image"; url: string };

export function flattenBlocks(blocks: ContentBlock[]): ReadItem[] {
  const items: ReadItem[] = [];
  for (const block of blocks) {
    if (block.type === "text" && block.words) {
      for (const word of block.words) {
        items.push({ kind: "word", text: word });
      }
    } else if (block.type === "image" && block.image_url) {
      items.push({ kind: "image", url: block.image_url });
    }
  }
  return items;
}