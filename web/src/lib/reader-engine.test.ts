import { describe, expect, it } from "vitest";
import {
  dwellSecondsRemaining,
  engineReducer,
  initialEngineState,
  intervalMsForWpm,
  type EngineAction,
  type EngineContext,
  type EngineState,
} from "@/lib/reader-engine";
import { SPECIAL_DWELL_MS } from "@/lib/math";
import type { ReadItem } from "@/lib/flatten";

const items: ReadItem[] = [
  { kind: "word", text: "alpha" },
  { kind: "word", text: "beta" },
  { kind: "image", url: "d/1.png" },
  { kind: "word", text: "E = mc²" },
  { kind: "word", text: "omega" },
];

function ctx(over: Partial<EngineContext> = {}): EngineContext {
  return { items, autoPauseImages: true, ...over };
}

/** Run a sequence of actions from an initial state. */
function run(
  actions: EngineAction[],
  context = ctx(),
  from = initialEngineState(0, items.length),
): EngineState {
  return actions.reduce((s, a) => engineReducer(s, a, context), from);
}

const play = { type: "toggle-play" } as const;

describe("initialEngineState", () => {
  it("starts paused at the given index", () => {
    expect(initialEngineState(2, 5)).toMatchObject({ index: 2, playing: false });
  });

  it("clamps an out-of-range index", () => {
    expect(initialEngineState(99, 5).index).toBe(4);
    expect(initialEngineState(-3, 5).index).toBe(0);
    expect(initialEngineState(0, 0).index).toBe(0);
  });
});

describe("toggle-play", () => {
  it("starts and stops playback", () => {
    let s = run([play]);
    expect(s.playing).toBe(true);
    s = engineReducer(s, play, ctx());
    expect(s.playing).toBe(false);
  });

  it("does not auto-pause when starting on a plain word", () => {
    const s = engineReducer(initialEngineState(1, items.length), play, ctx());
    expect(s).toMatchObject({ playing: true, dwell: "none" });
  });

  it("does not arm an image dwell when auto-pause is off", () => {
    const s = engineReducer(
      initialEngineState(2, items.length),
      play,
      ctx({ autoPauseImages: false }),
    );
    expect(s).toMatchObject({ playing: true, dwell: "none" });
  });

  it("refuses to start while sitting on a figure, and arms the dwell", () => {
    const s = engineReducer(initialEngineState(2, items.length), play, ctx());
    expect(s).toMatchObject({
      playing: false,
      dwell: "image",
      remainingMs: SPECIAL_DWELL_MS,
    });
  });

  it("refuses to start while sitting on a formula", () => {
    const s = engineReducer(initialEngineState(3, items.length), play, ctx());
    expect(s).toMatchObject({ playing: false, dwell: "math" });
  });

  it("acts as 'skip the pause' while dwelling", () => {
    const paused = engineReducer(initialEngineState(2, items.length), play, ctx());
    const skipped = engineReducer(paused, play, ctx());
    expect(skipped).toMatchObject({ playing: true, dwell: "none", remainingMs: 0 });
  });
});

describe("step", () => {
  it("moves forward and backward", () => {
    expect(run([play, { type: "step", delta: 1 }]).index).toBe(1);
    expect(run([{ type: "seek", index: 3 }, { type: "step", delta: -1 }]).index).toBe(2);
  });

  it("clamps at both ends", () => {
    expect(run([{ type: "step", delta: -1 }]).index).toBe(0);
    expect(run([{ type: "seek", index: 4 }, { type: "step", delta: 9 }]).index).toBe(4);
  });

  it("auto-pauses when stepping onto a figure while playing", () => {
    const s = run([{ type: "seek", index: 1 }, play, { type: "step", delta: 1 }]);
    expect(s).toMatchObject({
      index: 2,
      playing: false,
      dwell: "image",
      remainingMs: SPECIAL_DWELL_MS,
    });
  });

  it("does NOT auto-pause when stepping onto a figure while already paused", () => {
    const s = run([{ type: "step", delta: 1 }, { type: "step", delta: 1 }]);
    expect(s).toMatchObject({ index: 2, playing: false, dwell: "none" });
  });

  /**
   * Regression: stepping off a paused figure used to leave the image dwell
   * armed, so its timer later fired `resume()` and the reader started playing
   * on its own.
   */
  it("clears an active image dwell when stepping away", () => {
    const s = run([
      { type: "seek", index: 1 },
      play,
      { type: "step", delta: 1 }, // onto the figure -> dwells
      { type: "step", delta: 1 }, // onto the formula
    ]);
    expect(s.dwell).toBe("none");
    expect(s.remainingMs).toBe(0);
    expect(s.playing).toBe(false);
  });

  it("clears an active formula dwell when stepping away", () => {
    const s = run([
      { type: "seek", index: 2 },
      play,
      { type: "step", delta: 1 }, // onto the formula -> dwells
      { type: "step", delta: 1 }, // onto the last word
    ]);
    expect(s).toMatchObject({ index: 4, dwell: "none", remainingMs: 0 });
  });

  it("clears a figure dwell even when stepping backwards", () => {
    const s = run([
      { type: "seek", index: 1 },
      play,
      { type: "step", delta: 1 },
      { type: "step", delta: -1 },
    ]);
    expect(s).toMatchObject({ index: 1, dwell: "none", remainingMs: 0 });
  });
});

describe("advance", () => {
  it("moves one item and keeps playing through normal words", () => {
    const s = run([play, { type: "advance" }]);
    expect(s).toMatchObject({ index: 1, playing: true });
  });

  it("pauses playback on arrival at a figure", () => {
    const s = run([
      { type: "seek", index: 1 },
      play,
      { type: "advance" },
    ]);
    expect(s).toMatchObject({ index: 2, playing: false, dwell: "image" });
  });

  it("stops at the end instead of wrapping", () => {
    const s = run([{ type: "seek", index: 4 }, play, { type: "advance" }]);
    expect(s).toMatchObject({ index: 4, playing: false });
  });
});

describe("seek", () => {
  it("jumps without arming a dwell, even onto a figure", () => {
    const s = run([{ type: "seek", index: 2 }]);
    expect(s).toMatchObject({ index: 2, playing: false, dwell: "none" });
  });
});

describe("resume", () => {
  it("dismisses the dwell and plays", () => {
    const paused = engineReducer(initialEngineState(2, items.length), play, ctx());
    const s = engineReducer(paused, { type: "resume" }, ctx());
    expect(s).toMatchObject({ playing: true, dwell: "none", remainingMs: 0 });
  });
});

describe("set-remaining", () => {
  it("updates the countdown while dwelling", () => {
    const paused = engineReducer(initialEngineState(2, items.length), play, ctx());
    const s = engineReducer(paused, { type: "set-remaining", ms: 4000 }, ctx());
    expect(s.remainingMs).toBe(4000);
  });

  it("is ignored when nothing is dwelling", () => {
    const s = run([play, { type: "set-remaining", ms: 4000 }]);
    expect(s.remainingMs).toBe(0);
  });
});

describe("selectors", () => {
  it("rounds the dwell countdown up, never below 1", () => {
    const base = { ...initialEngineState(0, 1), dwell: "image" as const };
    expect(dwellSecondsRemaining({ ...base, remainingMs: 15_000 })).toBe(15);
    expect(dwellSecondsRemaining({ ...base, remainingMs: 1 })).toBe(1);
    expect(dwellSecondsRemaining({ ...base, remainingMs: 0 })).toBe(1);
    expect(dwellSecondsRemaining({ ...base, remainingMs: 400 })).toBe(1);
  });

  it("reports zero when not dwelling", () => {
    expect(dwellSecondsRemaining(initialEngineState(0, 1))).toBe(0);
  });

  it("maps wpm to a tick interval", () => {
    expect(intervalMsForWpm(600)).toBe(100);
    expect(intervalMsForWpm(0)).toBe(60000);
  });
});
