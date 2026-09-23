"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import clsx from "clsx";
import { KeyRound, LogOut, Type } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReadingPreferences } from "@/types";
import {
    DEFAULT_THEME,
    FONT_MAX,
    FONT_MIN,
    FONT_STEP,
    THEMES,
  WPM_MAX,
  WPM_MIN,
  WPM_STEP,
  type Theme,
} from "@/lib/constants";
import { updatePreferences } from "@/lib/preferences-api";
import { applyThemeClass } from "@/hooks/useReaderSettings";
import { SettingRow } from "@/components/reader/SettingsPanel";

const THEME_LABELS: Record<Theme, string> = {
  light: "Paper",
  dark: "Ink",
  sepia: "Sepia",
};

/** Single source of truth: the theme list comes from shared constants. */
const THEME_OPTIONS = THEMES.map((id) => ({ id, label: THEME_LABELS[id] }));

export default function SettingsForm({
  preferences,
  email,
}: {
  preferences: ReadingPreferences;
  email: string;
}) {
  const [wpm, setWpm] = useState(preferences.default_wpm);
  const [fontSize, setFontSize] = useState(preferences.font_size);
  const [theme, setTheme] = useState<Theme>(
    THEMES.includes(preferences.theme as Theme)
      ? (preferences.theme as Theme)
      : DEFAULT_THEME,
  );
  const [showProgressBar, setShowProgressBar] = useState(
    preferences.show_progress_bar,
  );
  const [highlightOrp, setHighlightOrp] = useState(preferences.highlight_orp);
  const [autoPauseImages, setAutoPauseImages] = useState(
    preferences.auto_pause_images,
  );

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme live so Settings mirrors the Reader.
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  function queueSave(patch: Partial<ReadingPreferences>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const result = await updatePreferences(patch);
      if (result.ok) {
        toast.success("Settings saved");
      } else {
        toast.error(result.error ?? "Couldn't save changes");
      }
    }, 500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      toast.success("Password updated successfully.");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Couldn't update password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tune how you read, and manage your account.
        </p>
      </header>

      {/* Reading settings */}
      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-ink">Reading defaults</h2>
          <p className="mt-0.5 text-xs text-muted">
            Applied to every new reading session.
          </p>
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          {/* Words per minute */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                Words per minute
              </span>
              <span className="pill pill-accent !text-xs font-bold tabular-nums">
                {wpm} WPM
              </span>
            </div>
            <input
              type="range"
              min={WPM_MIN}
              max={WPM_MAX}
              step={WPM_STEP}
              value={wpm}
              onChange={(e) => {
                const next = Number(e.target.value);
                setWpm(next);
                queueSave({ default_wpm: next });
              }}
              className="range-accent"
              aria-label="Words per minute"
            />
            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-subtle tabular-nums">
              <span>{WPM_MIN}</span>
              <span>{WPM_MAX}</span>
            </div>
          </div>

          {/* Font size */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Font size</span>
              <span
                className="flex items-center gap-1.5 font-bold leading-none text-ink tabular-nums"
                aria-hidden="true"
              >
                <Type className="h-3.5 w-3.5 text-subtle" />
                <span style={{ fontSize: Math.min(fontSize * 0.55, 22) }}>Aa</span>
                <span className="text-xs text-muted">{fontSize}px</span>
              </span>
            </div>
            <input
              type="range"
              min={FONT_MIN}
              max={FONT_MAX}
              step={FONT_STEP}
              value={fontSize}
              onChange={(e) => {
                const next = Number(e.target.value);
                setFontSize(next);
                queueSave({ font_size: next });
              }}
              className="range-accent"
              aria-label="Font size"
            />
            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-subtle tabular-nums">
              <span>{FONT_MIN}</span>
              <span>{FONT_MAX}</span>
            </div>
          </div>

          {/* Theme */}
          <div>
            <div className="mb-2.5 text-sm font-semibold text-ink">Theme</div>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    queueSave({ theme: t.id });
                  }}
                  className={clsx(
                    "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    theme === t.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line text-muted hover:border-line-strong hover:text-ink",
                  )}
                  aria-pressed={theme === t.id}
                >
                  <ThemeSwatch id={t.id} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3.5 border-t border-line pt-5">
            <SettingRow
              label="Show progress bar"
              checked={showProgressBar}
              onChange={(next) => {
                setShowProgressBar(next);
                queueSave({ show_progress_bar: next });
              }}
            />
            <SettingRow
              label="Highlight ORP character"
              checked={highlightOrp}
              onChange={(next) => {
                setHighlightOrp(next);
                queueSave({ highlight_orp: next });
              }}
            />
            <SettingRow
              label="Auto-pause images (15s)"
              checked={autoPauseImages}
              onChange={(next) => {
                setAutoPauseImages(next);
                queueSave({ auto_pause_images: next });
              }}
            />
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-ink">Account</h2>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label
              htmlFor="account-email"
              className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle"
            >
              Email
            </label>
            <input
              id="account-email"
              type="email"
              value={email}
              readOnly
              className="input cursor-not-allowed !bg-surface-soft !text-muted"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setPasswordOpen((v) => !v);
                setPasswordError(null);
              }}
              className="btn btn-outline btn-md"
              aria-expanded={passwordOpen}
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </button>

            {passwordOpen && (
              <form
                onSubmit={handleChangePassword}
                className="mt-4 space-y-3.5 rounded-2xl border border-line bg-surface-soft/50 p-4"
              >
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="input"
                  />
                </div>

                {passwordError && (
                  <p
                    className="rounded-xl px-3.5 py-2.5 text-sm font-medium"
                    style={{
                      background: "var(--color-danger-soft)",
                      color: "var(--color-danger)",
                    }}
                    role="alert"
                  >
                    {passwordError}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(false)}
                    className="btn btn-ghost btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="btn btn-primary btn-md disabled:opacity-60"
                  >
                    {changingPassword ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <Link
              href="/logout"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** A tiny two-tone preview of each theme. */
function ThemeSwatch({ id }: { id: Theme }) {
  const palette: Record<Theme, [string, string]> = {
    light: ["#faf9f6", "#2b3bff"],
    dark: ["#0e0f11", "#8e97ff"],
    sepia: ["#f1e8d7", "#2b3bff"],
  };
  const [bg, dot] = palette[id];
  return (
    <span
      className="flex h-4 w-6 shrink-0 items-center justify-center rounded-[5px] border border-line-strong"
      style={{ background: bg }}
      aria-hidden="true"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
    </span>
  );
}
