"use client";

import { Pause, Play, Settings, SkipBack, SkipForward, Type } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  FONT_MAX,
  FONT_MIN,
  FONT_STEP,
  WPM_MAX,
  WPM_MIN,
  WPM_PRESETS,
  WPM_STEP,
} from "@/lib/constants";
import type { ReaderSettings } from "@/hooks/useReaderSettings";
import Popover from "@/components/reader/Popover";
import SliderRow from "@/components/reader/SliderRow";
import SettingsPanel from "@/components/reader/SettingsPanel";

export type ReaderPanel = "wpm" | "font" | "settings";

const iconButton =
  "rounded-lg p-2 text-gray-700 transition hover:bg-black/5";

/** Transport controls: speed, scrub, play/pause, font size, settings. */
export default function ReaderControls({
  settings,
  playing,
  openPanel,
  setOpenPanel,
  onStep,
  onTogglePlay,
}: {
  settings: ReaderSettings;
  playing: boolean;
  openPanel: ReaderPanel | null;
  setOpenPanel: (panel: ReaderPanel | null) => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
}) {
  const panelToggle = (panel: ReaderPanel) => () =>
    setOpenPanel(openPanel === panel ? null : panel);

  const close = () => setOpenPanel(null);

  return (
    <div className="flex items-center justify-center gap-2 md:gap-5">
      {/* Inline speed slider — desktop only. */}
      <input
        type="range"
        min={WPM_MIN}
        max={WPM_MAX}
        step={WPM_STEP}
        value={settings.wpm}
        onChange={(e) => settings.setWpm(Number(e.target.value))}
        className="hidden w-28 accent-[#4F6EF6] md:block"
        aria-label="Words per minute"
      />

      <div className="hidden md:block">
        <Popover
          open={openPanel === "wpm"}
          onClose={close}
          label="Words per minute"
          className="w-56"
          trigger={
            <button
              type="button"
              onClick={panelToggle("wpm")}
              aria-expanded={openPanel === "wpm"}
              aria-haspopup="dialog"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-black/5"
            >
              {settings.wpm} WPM
            </button>
          }
        >
          <SpeedPanel settings={settings} />
        </Popover>
      </div>

      <button
        type="button"
        onClick={() => onStep(-1)}
        aria-label="Previous word"
        className="flex h-12 w-12 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5"
      >
        <SkipBack className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4F6EF6] text-white shadow-lg shadow-[#4F6EF6]/30 transition md:bg-black md:shadow-black/20"
      >
        {playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
      </button>

      <button
        type="button"
        onClick={() => onStep(1)}
        aria-label="Next word"
        className="flex h-12 w-12 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5"
      >
        <SkipForward className="h-5 w-5" />
      </button>

      <div className="hidden md:block">
        <Popover
          open={openPanel === "font"}
          onClose={close}
          label="Font size"
          className="w-56"
          trigger={
            <button
              type="button"
              onClick={panelToggle("font")}
              aria-label="Font size"
              aria-expanded={openPanel === "font"}
              aria-haspopup="dialog"
              className={iconButton}
            >
              <Type className="h-5 w-5" />
            </button>
          }
        >
          <SliderRow
            label="Font size"
            valueLabel={`${settings.fontSize}px Aa`}
            min={FONT_MIN}
            max={FONT_MAX}
            step={FONT_STEP}
            value={settings.fontSize}
            onChange={settings.setFontSize}
          />
        </Popover>
      </div>

      <div className="hidden md:block">
        <Popover
          open={openPanel === "settings"}
          onClose={close}
          label="Reading settings"
          className="w-72"
          trigger={
            <button
              type="button"
              onClick={panelToggle("settings")}
              aria-label="Reading settings"
              aria-expanded={openPanel === "settings"}
              aria-haspopup="dialog"
              className={iconButton}
            >
              <Settings className="h-5 w-5" />
            </button>
          }
        >
          <div className="space-y-4">
            <SettingsPanel settings={settings} />
          </div>
        </Popover>
      </div>

      {/* Mobile: the parent renders settings as a bottom sheet. */}
      <button
        type="button"
        onClick={() => setOpenPanel("settings")}
        aria-label="Reading settings"
        className="flex h-12 w-12 items-center justify-center rounded-lg text-gray-700 transition hover:bg-black/5 md:hidden"
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}

function SpeedPanel({ settings }: { settings: ReaderSettings }) {
  return (
    <>
      <SliderRow
        label="Words per minute"
        valueLabel={settings.wpm}
        min={WPM_MIN}
        max={WPM_MAX}
        step={WPM_STEP}
        value={settings.wpm}
        onChange={settings.setWpm}
      />
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {WPM_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              settings.setWpm(preset);
              toast.success(`${preset} WPM`, { id: "reader-wpm" });
            }}
            className={clsx(
              "rounded-lg px-1 py-1.5 text-xs font-semibold transition",
              settings.wpm === preset
                ? "bg-[#4F6EF6] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {preset}
          </button>
        ))}
      </div>
    </>
  );
}
