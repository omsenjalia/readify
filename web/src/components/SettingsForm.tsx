"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, KeyRound, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReadingPreferences } from "@/types";

type Theme = "light" | "dark" | "sepia";

const THEMES: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "sepia", label: "Sepia" },
];

function SettingToggle({
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
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg px-1 py-2"
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span
        className={clsx(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-[#4F6EF6]" : "bg-gray-300",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export default function SettingsForm({
  preferences,
  email,
}: {
  preferences: ReadingPreferences;
  email: string;
}) {
  const [wpm, setWpm] = useState(preferences.default_wpm);
  const [fontSize, setFontSize] = useState(preferences.font_size);
  const [theme, setTheme] = useState<Theme>(preferences.theme as Theme);
  const [showProgressBar, setShowProgressBar] = useState(
    preferences.show_progress_bar,
  );
  const [highlightOrp, setHighlightOrp] = useState(preferences.highlight_orp);
  const [autoPauseImages, setAutoPauseImages] = useState(
    preferences.auto_pause_images,
  );

  const [saved, setSaved] = useState(false);
  const [savedError, setSavedError] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme live so Settings mirrors the Reader.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "sepia");
    if (theme === "dark" || theme === "sepia") {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  function showSaved() {
    setSavedError(false);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  function queueSave(patch: Partial<ReadingPreferences>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("save failed");
        showSaved();
      } catch {
        setSavedError(true);
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 2000);
      }
    }, 500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordDone(false);

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
      setPasswordDone(true);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Couldn't update password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Settings
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Customize how you read and manage your account.
      </p>

      {/* Reading settings */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Reading settings
          </h2>
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          {/* Words per minute */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Words per minute
              </span>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700">
                {wpm} WPM
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={800}
              step={25}
              value={wpm}
              onChange={(e) => {
                const next = Number(e.target.value);
                setWpm(next);
                queueSave({ default_wpm: next });
              }}
              className="w-full accent-[#4F6EF6]"
              aria-label="Words per minute"
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>100</span>
              <span>800</span>
            </div>
          </div>

          {/* Font size */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Font size
              </span>
              <span
                className="leading-none text-gray-900"
                style={{ fontSize: Math.min(fontSize, 40) }}
                aria-hidden="true"
              >
                Aa
              </span>
            </div>
            <input
              type="range"
              min={28}
              max={68}
              step={4}
              value={fontSize}
              onChange={(e) => {
                const next = Number(e.target.value);
                setFontSize(next);
                queueSave({ font_size: next });
              }}
              className="w-full accent-[#4F6EF6]"
              aria-label="Font size"
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>28</span>
              <span>68</span>
            </div>
          </div>

          {/* Theme */}
          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Theme</div>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    queueSave({ theme: t.id });
                  }}
                  className={clsx(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    theme === t.id
                      ? "border-[#4F6EF6] bg-[#4F6EF6] text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-1 border-t border-gray-100 pt-4">
            <SettingToggle
              label="Show progress bar"
              checked={showProgressBar}
              onChange={(next) => {
                setShowProgressBar(next);
                queueSave({ show_progress_bar: next });
              }}
            />
            <SettingToggle
              label="Highlight ORP character"
              checked={highlightOrp}
              onChange={(next) => {
                setHighlightOrp(next);
                queueSave({ highlight_orp: next });
              }}
            />
            <SettingToggle
              label="Auto-pause on images"
              checked={autoPauseImages}
              onChange={(next) => {
                setAutoPauseImages(next);
                queueSave({ auto_pause_images: next });
              }}
            />
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <label
              htmlFor="account-email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="account-email"
              type="email"
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500 outline-none"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setPasswordOpen((v) => !v);
                setPasswordError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </button>

            {passwordDone && !passwordOpen && (
              <p className="mt-2 text-sm font-medium text-green-600">
                Password updated successfully.
              </p>
            )}

            {passwordOpen && (
              <form
                onSubmit={handleChangePassword}
                className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {passwordError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {passwordError}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(false)}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {changingPassword ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <Link
              href="/logout"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </div>
        </div>
      </div>

      {/* Save confirmation toast */}
      {saved && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-8">
          <div
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white shadow-xl",
              savedError ? "bg-red-600" : "bg-gray-900",
            )}
          >
            {!savedError && <Check className="h-3.5 w-3.5" />}
            {savedError ? "Couldn't save changes" : "Saved"}
          </div>
        </div>
      )}
    </div>
  );
}