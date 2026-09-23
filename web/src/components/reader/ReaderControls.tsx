"use client";

import {
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Rows3,
  Settings,
  SkipBack,
  SkipForward,
  Type,
} from "lucide-react";
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
  type ReadingMode,
} from "@/lib/constants";
import type { ReaderSettings } from "@/hooks/useReaderSettings";
import Popover from "@/components/reader/Popover";
import SliderRow from "@/components/reader/SliderRow";
import SettingsPanel from "@/components/reader/SettingsPanel";

export type ReaderPanel = "wpm" | "font" | "settings";

const iconButton =
  "flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink active:scale-95";

/** Transport controls: mode, speed, scrub, play/pause, font size, settings. */
export default function ReaderControls({
  settings,
  playing,
  mode,
  onModeChange,
  openPanel,
  setOpenPanel,
  onStep,
  onTogglePlay,
  onReset,
}: {
  settings: ReaderSettings;
  playing: boolean;
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
  openPanel: ReaderPanel | null;
  setOpenPanel: (panel: ReaderPanel | null) => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
}) {
  const panelToggle = (panel: ReaderPanel) => () =>
    setOpenPanel(openPanel === panel ? null : panel);

  const close = () => setOpenPanel(null);

  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      {/* Mode + speed chips */}
      <div className="flex items-center justify-center gap-2">
        <ModeSegmented mode={mode} onChange={onModeChange} />

        <button
          type="button"
          onClick={() => setOpenPanel("settings")}
          className="pill !py-1.5 font-semibold text-ink transition hover:border-accent md:hidden"
          aria-label="Speed and reading settings"
        >
          <Gauge className="h-3.5 w-3.5 text-accent" />
          {settings.wpm} WPM
        </button>

        {/* Inline speed slider — desktop only. */}
        <div className="hidden items-center gap-2.5 md:flex">
          <input
            type="range"
            min={WPM_MIN}
            max={WPM_MAX}
            step={WPM_STEP}
            value={settings.wpm}
            onChange={(e) => settings.setWpm(Number(e.target.value))}
            className="range-accent w-28"
            aria-label="Words per minute"
          />
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
                className="rounded-full px-3 py-1.5 text-sm font-bold text-ink tabular-nums transition hover:bg-surface-soft"
              >
                {settings.wpm} WPM
              </button>
            }
          >
            <SpeedPanel settings={settings} />
          </Popover>
        </div>
      </div>

      {/* Transport row */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3">
        {/* Mobile-only settings. `order-last` moves it to the right edge on
          small screens so the transport row stays symmetric around the play
          button ([reset][back] · play · [next][settings]) instead of the
          play button sitting off-centre. On md+ this button is hidden and
          the desktop settings popover takes its place, so desktop balance
          (3 buttons each side) is unaffected. */}
        <button
          type="button"
          onClick={() => setOpenPanel("settings")}
          aria-label="Reading settings"
          className={clsx(iconButton, "order-last md:hidden")}
        >
          <Settings className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label="Back to the beginning"
          title="Back to the beginning"
          className={iconButton}
        >
          <RotateCcw className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label="Previous word"
          className={iconButton}
        >
          <SkipBack className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent transition active:scale-95 md:h-14 md:w-14"
          style={{
            boxShadow:
              "0 10px 32px color-mix(in srgb, var(--color-accent) 40%, transparent)",
          }}
        >
          {playing ? (
            <Pause className="h-6 w-6 md:h-5.5 md:w-5.5" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-6 w-6 md:h-5.5 md:w-5.5" fill="currentColor" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onStep(1)}
          aria-label="Next word"
          className={iconButton}
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
      </div>
    </div>
  );
}

/** One word vs Line Flow — the reader's two display modes.
 * One word is the default; Line Flow is the secondary mode. */
export function ModeSegmented({
  mode,
  onChange,
}: {
  mode: ReadingMode;
  onChange: (mode: ReadingMode) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5"
      role="radiogroup"
      aria-label="Reading mode"
    >
      <ModeOption
        active={mode === "word"}
        onClick={() => onChange("word")}
        label="One word"
        short="Word"
        icon={<Type className="h-3.5 w-3.5" />}
      />
      <ModeOption
        active={mode === "line"}
        onClick={() => onChange("line")}
        label="Line Flow"
        short="Line"
        icon={<Rows3 className="h-3.5 w-3.5" />}
      />
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  label,
  short,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  short: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:text-ink",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{short}</span>
    </button>
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
              "rounded-lg px-1 py-1.5 text-xs font-bold tabular-nums transition",
              settings.wpm === preset
                ? "bg-accent text-on-accent"
                : "bg-surface-soft text-muted hover:text-ink",
            )}
          >
            {preset}
          </button>
        ))}
      </div>
    </>
  );
}
