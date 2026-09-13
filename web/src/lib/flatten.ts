import type { WordBlock } from "@/types";
import { orpIndex } from "@/lib/orp";

// Block flattening — placeholder.
//
// The processor returns documents as a list of text/heading blocks. This
// helper normalizes them into an ordered list of WordBlocks, each tagged
// with its ORP index so the reader can highlight it during playback.

const BLOCK_GLUE: Record<string, string> = {
  heading: "\n\n",
  paragraph: "\n\n",
  list_item: "\n",
};

export function flattenBlocks(
  blocks: Array<{ type: string; text: string }>
): WordBlock[] {
  const output: WordBlock[] = [];
  let id = 0;

  const pushWord = (text: string, glue: string) => {
    if (id > 0 && glue) {
      output.push({ id: String(id++), text: glue, orpIndex: 0 });
    }
    for (const raw of text.split(/\s+/)) {
      const word = raw.trim();
      if (!word) continue;
      output.push({ id: String(id++), text: word, orpIndex: orpIndex(word) });
    }
  };

  for (const block of blocks) {
    const glue = BLOCK_GLUE[block.type] ?? "\n";
    pushWord(block.text, glue);
  }

  return output;
}