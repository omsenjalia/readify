import { describe, expect, it } from "vitest";
import { defaultYouTubeTitle, extractYouTubeId } from "@/lib/youtube";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  it.each([
    ["bare id", `https://www.youtube.com/watch?v=${ID}`],
    ["no www", `https://youtube.com/watch?v=${ID}`],
    ["mobile", `https://m.youtube.com/watch?v=${ID}`],
    ["short link", `https://youtu.be/${ID}`],
    ["embed", `https://www.youtube.com/embed/${ID}`],
    ["shorts", `https://www.youtube.com/shorts/${ID}`],
    ["live", `https://www.youtube.com/live/${ID}`],
    ["extra params before v", `https://www.youtube.com/watch?t=42&v=${ID}`],
    ["extra params after v", `https://www.youtube.com/watch?v=${ID}&t=42`],
    ["list before v", `https://www.youtube.com/watch?list=PL1&v=${ID}`],
  ])("parses %s", (_label, url) => {
    expect(extractYouTubeId(url)).toBe(ID);
  });

  it("handles ids containing hyphens and underscores", () => {
    const weird = "ab-cd_ef-12";
    expect(extractYouTubeId(`https://youtu.be/${weird}`)).toBe(weird);
  });

  it("ignores surrounding whitespace", () => {
    expect(extractYouTubeId(`  https://youtu.be/${ID}  `)).toBe(ID);
  });

  it("returns null for non-YouTube and malformed input", () => {
    expect(extractYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(extractYouTubeId("not a url")).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
    // id too short
    expect(extractYouTubeId("https://youtu.be/abc")).toBeNull();
  });
});

describe("defaultYouTubeTitle", () => {
  it("uses the video id when one is parseable", () => {
    expect(defaultYouTubeTitle(`https://youtu.be/${ID}`)).toBe(`YouTube – ${ID}`);
  });

  it("falls back to Untitled for junk", () => {
    expect(defaultYouTubeTitle("nope")).toBe("Untitled");
  });
});
