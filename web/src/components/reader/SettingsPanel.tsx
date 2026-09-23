"use client";

import { Type } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  FONT_MAX,
  FONT_MIN,
  FONT_STEP,
  WPM_MAX,
  WPM_MIN,
  WPM_STEP,
} from "@/lib/constants";
import type { ReaderSettings } from "@/hooks/useReaderSettings";
import SliderRow from "@/components/reader/SliderRow";

/**
 * Speed / font / toggle controls.
 *
 * Rendered in two places (the desktop popover and the mobile bottom sheet);
 * keeping it one component means the two can never drift.
 */
export default function SettingsPanel({
  settings,
}: {
  settings: ReaderSettings;
}) {
  return (
    <>
      <SliderRow
        label="Words per minute"
        valueLabel={`${settings.wpm} WPM`}
        min={WPM_MIN}
        max={WPM_MAX}
        step={WPM_STEP}
        value={settings.wpm}
        onChange={settings.setWpm}
      />

      <SliderRow
        label="Font size"
        valueLabel={
          <span className="flex items-center gap-1">
            <Type className="h-3.5 w-3.5" /> {settings.fontSize}px
          </span>
        }
        min={FONT_MIN}
        max={FONT_MAX}
        step={FONT_STEP}
        value={settings.fontSize}
        onChange={settings.setFontSize}
      />

      <div className="space-y-3">
        <SettingRow
          label="Show progress bar"
          checked={settings.showProgressBar}
          onChange={(v) => {
            settings.setShowProgressBar(v);
            toast.success(v ? "Progress bar on" : "Progress bar off", {
              id: "reader-toggle",
            });
          }}
        />
        <SettingRow
          label="Highlight ORP character"
          checked={settings.highlightOrp}
          onChange={(v) => {
            settings.setHighlightOrp(v);
            toast.success(v ? "ORP highlight on" : "ORP highlight off", {
              id: "reader-toggle",
            });
          }}
        />
        <SettingRow
          label="Auto-pause images (15s)"
          checked={settings.autoPauseImages}
          onChange={(v) => {
            settings.setAutoPauseImages(v);
            toast.success(v ? "Auto-pause on" : "Auto-pause off", {
              id: "reader-toggle",
            });
          }}
        />
      </div>
    </>
  );
}

export function SettingRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4"
    >
      <span className="text-sm font-medium text-ink">{label}</span>
      <span
        className={clsx(
          "relative h-5.5 w-10 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "border border-line-strong bg-surface-soft",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[19px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
