"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  BookOpen,
  ChevronDown,
  Globe,
  Lock,
  Minimize,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Settings,
  Share2,
  SkipBack,
  SkipForward,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { splitAtORP } from "@/lib/orp";
import {
  getLocalProgress,
  getRemoteProgress,
  pctComplete,
  setLocalProgress,
  setRemoteProgress,
} from "@/lib/progress";
import { getPreferences, savePreferences } from "@/lib/preferences";
import type { ReadItem } from "@/lib/flatten";
import ShareModal, { type ReaderShareDoc } from "@/components/ShareModal";

export default function ReaderClient({
  document: doc,
  items,
  isOwner,
  isSignedIn,
  userId,
  preferences,
  initialIndex,
  initialWpm,
}: {
  document: {
    id: string;
    title: string;
    visibility: string;
    user_id: string | null;
    slug: string;
  };
  items: ReadItem[];
  isOwner: boolean;
  isSignedIn: boolean;
  userId: string | null;
  preferences: {
    default_wpm?: number;
    font_size?: number;
    theme?: string | null;
    show_progress_bar?: boolean | null;
    highlight_orp?: boolean | null;
    auto_pause_images?: boolean | null;
  } | null;
  initialIndex?: number;
  initialWpm?: number;
}) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(initialIndex ?? 0, 0), Math.max(items.length - 1, 0)),
  );
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(
    Math.min(800, Math.max(100, initialWpm ?? 800)),
  );
  const isSmallViewport = useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia("(max-width: 639px)");
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
  const [fontOverride, setFontOverride] = useState<number | null>(null);
  // Default font is smaller on phones unless the user chooses one explicitly.
  const fontSize = Math.min(
    68,
    Math.max(
      28,
      fontOverride ?? preferences?.font_size ?? (isSmallViewport ? 36 : 48),
    ),
  );
  const [theme, setTheme] = useState<string>(preferences?.theme ?? "light");
  const [showProgressBar, setShowProgressBar] = useState(
    preferences?.show_progress_bar ?? true,
  );
  const [highlightOrp, setHighlightOrp] = useState(
    preferences?.highlight_orp ?? true,
  );
  const [autoPauseImages, setAutoPauseImages] = useState(
    preferences?.auto_pause_images ?? true,
  );
  const [imagePaused, setImagePaused] = useState(false);
  const [imageRemaining, setImageRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [wpmOpen, setWpmOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSection, setShareSection] = useState<"link" | "visibility">(
    "link",
  );
  const [resumePrompt, setResumePrompt] = useState<{
    index: number;
    wpm: number;
  } | null>(null);

  const [title, setTitle] = useState(doc.title);
  const [visibility, setVisibility] = useState(doc.visibility);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ownerId = isOwner ? doc.user_id : null;
  const authUserId = userId;

  const publicDoc = visibility === "public";

  const totalWords = items.filter((i) => i.kind === "word").length;
  const wordsRead = items
    .slice(0, currentIndex + 1)
    .filter((i) => i.kind === "word").length;
  const pct = pctComplete(wordsRead, totalWords);
  const wordsLeft = Math.max(0, totalWords - wordsRead);
  const minsLeft = wordsLeft > 0 ? Math.ceil(wordsLeft / wpm) : 0;
  const readMinutes = Math.max(1, Math.round(totalWords / Math.max(wpm, 1)));

  const shareDoc: ReaderShareDoc = {
    id: doc.id,
    slug: doc.slug,
    title,
    visibility: visibility === "public" ? "public" : "private",
    wordCount: totalWords,
    readMinutes,
  };

  const shareModal = (
    <ShareModal
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      doc={shareDoc}
      initialSection={shareSection}
      onVisibilityChange={(v) => setVisibility(v)}
    />
  );

  const currentItem = items[currentIndex];
  const prevItem = currentIndex > 0 ? items[currentIndex - 1] : undefined;
  const nextItem =
    currentIndex < items.length - 1 ? items[currentIndex + 1] : undefined;

  const playingRef = useRef(playing);
  const currentIndexRef = useRef(currentIndex);
  const imagePausedRef = useRef(imagePaused);
  const wpmRef = useRef(wpm);
  const lastSavedRef = useRef(initialIndex ?? 0);
  const progressLoadedRef = useRef(false);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  function sendSafe(query: PromiseLike<{ error: unknown }>) {
    query.then(
      ({ error }) => {
        if (error) console.warn("Readify sync failed:", error);
      },
      (err) => {
        console.warn("Readify sync failed:", err);
      },
    );
  }

  const saveProgress = useCallback(
    (index: number, speed: number) => {
      if (authUserId) {
        setRemoteProgress(doc.id, authUserId, index, speed).then(
          () => {},
          (err) => console.warn("Readify sync failed:", err),
        );
      } else {
        setLocalProgress(doc.slug, index, speed);
      }
    },
    [authUserId, doc.id, doc.slug],
  );
  const saveProgressRef = useRef(saveProgress);

  useEffect(() => {
    playingRef.current = playing;
    currentIndexRef.current = currentIndex;
    imagePausedRef.current = imagePaused;
    wpmRef.current = wpm;
    saveProgressRef.current = saveProgress;
  });

  useEffect(
    () => () =>
      saveProgressRef.current(currentIndexRef.current, wpmRef.current),
    [],
  );

  useEffect(() => {
    if (resumePrompt) return;
    if (currentIndex - lastSavedRef.current >= 10) {
      saveProgress(currentIndex, wpm);
      lastSavedRef.current = currentIndex;
    }
  }, [currentIndex, wpm, saveProgress, resumePrompt]);

  useEffect(() => {
    if (!authUserId) return;
    const id = setTimeout(() => {
      void savePreferences(authUserId, {
        default_wpm: wpm,
        font_size: fontSize,
        theme,
        show_progress_bar: showProgressBar,
        highlight_orp: highlightOrp,
        auto_pause_images: autoPauseImages,
      });
    }, 500);
    return () => clearTimeout(id);
  }, [
    authUserId,
    wpm,
    fontSize,
    theme,
    showProgressBar,
    highlightOrp,
    autoPauseImages,
  ]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "sepia");
    if (theme === "dark" || theme === "sepia") {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (progressLoadedRef.current) return;
    progressLoadedRef.current = true;

    const clampIndex = (i: number) =>
      Math.min(Math.max(i, 0), Math.max(items.length - 1, 0));
    const clampWpm = (w: number) => Math.min(800, Math.max(100, w));
    const applyProgress = (
      idx: number,
      speed: number,
    ) => {
      setCurrentIndex(idx);
      setWpm(clampWpm(speed));
      setResumePrompt({ index: idx, wpm: clampWpm(speed) });
    };

    if (authUserId) {
      Promise.all([
        getRemoteProgress(doc.id, authUserId),
        getPreferences(authUserId),
      ]).then(([progress, prefs]) => {
        if (prefs) {
          if (typeof prefs.font_size === "number")
            setFontOverride(prefs.font_size);
          if (prefs.theme) setTheme(prefs.theme);
          if (prefs.show_progress_bar != null)
            setShowProgressBar(!!prefs.show_progress_bar);
          if (prefs.highlight_orp != null)
            setHighlightOrp(!!prefs.highlight_orp);
          if (prefs.auto_pause_images != null)
            setAutoPauseImages(!!prefs.auto_pause_images);
        }
        if (progress && progress.word_index > 0) {
          const idx = clampIndex(progress.word_index);
          applyProgress(idx, progress.wpm);
          lastSavedRef.current = idx;
        }
      });
    } else {
      queueMicrotask(() => {
        const local = getLocalProgress(doc.slug);
        if (local && local.index > 0) {
          applyProgress(clampIndex(local.index), local.wpm);
        }
      });
    }
  }, [authUserId, doc.id, doc.slug, items.length]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(items.length - 1, Math.max(0, next));
      setCurrentIndex(clamped);
      const item = items[clamped];
      if (item?.kind === "image" && playingRef.current && autoPauseImages) {
        setPlaying(false);
        setImagePaused(true);
        setImageRemaining(3500);
      }
    },
    [items, autoPauseImages],
  );

  const advance = useCallback(() => {
    const next = currentIndexRef.current + 1;
    if (next >= items.length) {
      setPlaying(false);
      saveProgressRef.current(items.length - 1, wpmRef.current);
      return;
    }
    goTo(next);
  }, [items.length, goTo]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(advance, 60000 / wpm);
    return () => clearInterval(id);
  }, [playing, wpm, advance]);

  const resume = useCallback(() => {
    setImagePaused(false);
    setImageRemaining(0);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!imagePaused) return;
    const started = Date.now();
    const iv = setInterval(() => {
      setImageRemaining(Math.max(0, 3500 - (Date.now() - started)));
    }, 200);
    const t = setTimeout(resume, 3500);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [imagePaused, resume]);

  const step = useCallback(
    (delta: number) => {
      goTo(currentIndexRef.current + delta);
    },
    [goTo],
  );

  const changeWpm = useCallback((delta: number) => {
    setWpm((w) => Math.min(800, Math.max(100, w + delta)));
  }, []);

  const togglePlay = useCallback(() => {
    if (imagePausedRef.current) {
      resume();
      return;
    }
    const item = items[currentIndexRef.current];
    if (item?.kind === "image" && autoPauseImages && !playingRef.current) {
      setImagePaused(true);
      setImageRemaining(3500);
      return;
    }
    if (playingRef.current) {
      saveProgressRef.current(currentIndexRef.current, wpmRef.current);
    }
    setPlaying((p) => !p);
  }, [items, autoPauseImages, resume]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.min(800, wpmRef.current + 25);
        changeWpm(25);
        toast.success(`${next} WPM`, { id: "reader-wpm" });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.max(100, wpmRef.current - 25);
        changeWpm(-25);
        toast.success(`${next} WPM`, { id: "reader-wpm" });
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, step, changeWpm, toggleFullscreen]);

  function openShare(section: "link" | "visibility") {
    setShareSection(section);
    setShareOpen(true);
    setMenuOpen(false);
  }

  function handleResumeAccept() {
    if (!resumePrompt) return;
    lastSavedRef.current = resumePrompt.index;
    setResumePrompt(null);
    toast.success(
      `Resumed from word ${resumePrompt.index.toLocaleString()}`,
    );
  }

  function handleResumeDismiss() {
    setCurrentIndex(0);
    lastSavedRef.current = 0;
    setResumePrompt(null);
    toast("Started from the beginning");
  }

  async function handleRename() {
    const next = renameValue.trim() || doc.title;
    setTitle(next);
    setRenaming(false);
    if (!ownerId || next === doc.title) return;
    sendSafe(
      getSupabase()
        .from("documents")
        .update({ title: next, updated_at: new Date().toISOString() })
        .eq("id", doc.id),
    );
  }

  async function handleDelete() {
    if (!ownerId) return;
    setDeleting(true);
    try {
      await getSupabase().from("documents").delete().eq("id", doc.id);
      router.push("/library");
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const sideWidth = fontSize * 4.2;
  const orpWidth = fontSize * 0.72;

  const Header = (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <Link
          href={authUserId ? "/library" : "/"}
          className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight"
        >
          <BookOpen className="h-4 w-4 text-[#4F6EF6]" />
          Readify
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="hidden min-w-0 max-w-[40vw] truncate text-sm font-medium md:block">
            {title}
          </span>

          <span
            className={clsx(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              publicDoc
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-600",
            )}
          >
            {publicDoc ? "Public" : "Private"}
          </span>

          {isOwner && (
            <button
              type="button"
              onClick={() => openShare("link")}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium transition hover:bg-black/5"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          )}

          {isOwner && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Document menu"
                className="rounded-lg p-2 transition hover:bg-black/5"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-black/10 bg-[var(--background)] p-1.5 shadow-xl">
                    {renaming ? (
                      <div className="p-1">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename();
                            if (e.key === "Escape") setRenaming(false);
                          }}
                          onFocus={(e) => e.currentTarget.select()}
                          autoFocus
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#4F6EF6]"
                        />
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRenaming(false)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-black/5"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleRename}
                            className="rounded-lg bg-[#4F6EF6] px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-110"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <MenuItem
                          icon={<Pencil className="h-4 w-4" />}
                          label="Rename"
                          onClick={() => {
                            setRenameValue(title);
                            setRenaming(true);
                          }}
                        />
                        <MenuItem
                          icon={
                            publicDoc ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Globe className="h-4 w-4" />
                            )
                          }
                          label={publicDoc ? "Make private" : "Make public"}
                          onClick={() => openShare("visibility")}
                        />
                        <div className="my-1 border-t border-black/10" />
                        <MenuItem
                          icon={<Trash2 className="h-4 w-4 text-indigo-600" />}
                          label="Delete"
                          danger
                          onClick={() => {
                            setMenuOpen(false);
                            setConfirmingDelete(true);
                          }}
                        />
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!isSignedIn && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-black/10 bg-black/[0.03] px-4 py-2">
          <p className="text-xs font-medium sm:text-sm">
            Sign up to save your reading progress
          </p>
          <Link
            href="/signup"
            className="rounded-full bg-[#4F6EF6] px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[#4F6EF6] transition hover:bg-black/5"
          >
            Log in
          </Link>
        </div>
      )}
    </header>
  );

  const settingsControls = (
    <>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            Words per minute
          </span>
          <span className="text-sm font-semibold text-gray-900">{wpm} WPM</span>
        </div>
        <input
          type="range"
          min={100}
          max={800}
          step={25}
          value={wpm}
          onChange={(e) => setWpm(Number(e.target.value))}
          className="w-full accent-[#4F6EF6]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>100</span>
          <span>800</span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Font size</span>
          <span className="flex items-center gap-1 text-sm font-semibold text-gray-900">
            <Type className="h-3.5 w-3.5" /> {fontSize}px
          </span>
        </div>
        <input
          type="range"
          min={28}
          max={68}
          step={4}
          value={fontSize}
          onChange={(e) => setFontOverride(Number(e.target.value))}
          className="w-full accent-[#4F6EF6]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>28</span>
          <span>68</span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-gray-500">Theme</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "sepia", label: "Sepia" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTheme(t.id);
                toast.success(`${t.label} theme`, { id: "reader-theme" });
              }}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
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

      <div className="space-y-2.5">
        <SettingRow
          label="Show progress bar"
          checked={showProgressBar}
          onChange={(v) => {
            setShowProgressBar(v);
            toast.success(v ? "Progress bar on" : "Progress bar off", {
              id: "reader-toggle",
            });
          }}
        />
        <SettingRow
          label="Highlight ORP char"
          checked={highlightOrp}
          onChange={(v) => {
            setHighlightOrp(v);
            toast.success(v ? "ORP highlight on" : "ORP highlight off", {
              id: "reader-toggle",
            });
          }}
        />
        <SettingRow
          label="Auto-pause images"
          checked={autoPauseImages}
          onChange={(v) => {
            setAutoPauseImages(v);
            toast.success(v ? "Auto-pause on" : "Auto-pause off", {
              id: "reader-toggle",
            });
          }}
        />
      </div>
    </>
  );

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        {Header}
        <main className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <BookOpen className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">
              This document has no readable content yet.
            </p>
          </div>
        </main>
        {shareModal}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {!isFullscreen && Header}

      {showProgressBar && (
        <div className="mx-auto w-full max-w-3xl px-6 pb-1 pt-3">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-gray-200/70">
            <div
              className="h-full rounded-full bg-[#4F6EF6] transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>{pct}% complete</span>
            <span>
              {wordsLeft.toLocaleString()} words • {minsLeft} min left
            </span>
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        {currentItem?.kind === "image" ? (
          <div className="flex flex-col items-center">
            <img
              src={currentItem.url}
              alt="Document figure"
              className="max-h-64 rounded-xl object-contain shadow-lg"
            />
            {imagePaused && autoPauseImages && (
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-[#4F6EF6]">
                  Resuming in {Math.max(1, Math.round(imageRemaining / 1000))}s…
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Press Space to continue
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex w-full max-w-3xl flex-col items-center justify-center"
            style={{ height: 200 }}
          >
            <div
              className="flex h-[40%] w-full items-center justify-center overflow-hidden"
              style={{
                fontSize: fontSize * 0.6,
                color: "var(--muted-foreground)",
                opacity: 0.3,
              }}
            >
              <span className="truncate">
                {prevItem && prevItem.kind === "word" ? prevItem.text : ""}
              </span>
            </div>

            <div className="relative flex w-full items-center justify-center">
              <div
                className="absolute inset-y-[-14px] w-px bg-indigo-400/25"
                style={{ left: `calc(50% - ${orpWidth / 2}px)` }}
              />
              <div
                className="absolute -top-[14px] h-1 w-1 rounded-full bg-[#4f46e5]"
                style={{ left: `calc(50% - 2px)` }}
              />
              <div
                className="relative flex"
                style={{ fontSize, lineHeight: 1.1, fontWeight: 600 }}
              >
                <span
                  style={{ width: sideWidth, textAlign: "right" }}
                  className="whitespace-pre"
                >
                  {currentItem?.kind === "word"
                    ? splitAtORP(currentItem.text).before
                    : ""}
                </span>
                <span
                  style={{
                    width: orpWidth,
                    textAlign: "center",
                    fontWeight: highlightOrp ? 800 : 600,
                    color: highlightOrp ? "#4F6EF6" : "inherit",
                  }}
                >
                  {currentItem?.kind === "word"
                    ? splitAtORP(currentItem.text).orp
                    : ""}
                </span>
                <span
                  style={{ width: sideWidth, textAlign: "left" }}
                  className="whitespace-pre"
                >
                  {currentItem?.kind === "word"
                    ? splitAtORP(currentItem.text).after
                    : ""}
                </span>
              </div>
            </div>

            <div
              className="flex h-[40%] w-full items-center justify-center overflow-hidden"
              style={{
                fontSize: fontSize * 0.6,
                color: "var(--muted-foreground)",
                opacity: 0.3,
              }}
            >
              <span className="truncate">
                {nextItem && nextItem.kind === "word" ? nextItem.text : ""}
              </span>
            </div>
          </div>
        )}
      </main>

      <div className="flex flex-col items-center gap-3 pb-6 pt-2">
        <div className="flex items-center justify-center gap-2 md:gap-5">
          <input
            type="range"
            min={100}
            max={800}
            step={25}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="hidden w-28 accent-[#4F6EF6] md:block"
          />

          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setWpmOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-black/5"
            >
              {wpm} WPM
              <ChevronDown
                className={clsx("h-3.5 w-3.5 transition", wpmOpen && "rotate-180")}
              />
            </button>
            {wpmOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setWpmOpen(false)}
                />
                <div className="absolute bottom-10 left-1/2 z-20 w-56 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Words per minute
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {wpm}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={800}
                    step={25}
                    value={wpm}
                    onChange={(e) => setWpm(Number(e.target.value))}
                    className="mt-2 w-full accent-[#4F6EF6]"
                  />
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {[200, 400, 600, 800].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setWpm(preset);
                          toast.success(`${preset} WPM`, {
                            id: "reader-wpm",
                          });
                        }}
                        className={clsx(
                          "rounded-lg px-1 py-1.5 text-xs font-semibold transition",
                          wpm === preset
                            ? "bg-[#4F6EF6] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous word"
            className="flex h-12 w-12 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4F6EF6] text-white shadow-lg shadow-[#4F6EF6]/30 transition md:bg-black md:shadow-black/20"
          >
            {playing ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-0.5 h-6 w-6" />
            )}
          </button>

          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next word"
            className="flex h-12 w-12 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setFontOpen((v) => !v)}
              aria-label="Font size"
              className="rounded-lg p-2 text-gray-700 transition hover:bg-black/5"
            >
              <Type className="h-5 w-5" />
            </button>
            {fontOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setFontOpen(false)}
                />
                <div className="absolute bottom-10 left-1/2 z-20 w-56 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Font size
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {fontSize}px Aa
                    </span>
                  </div>
                  <input
                    type="range"
                    min={28}
                    max={68}
                    step={4}
                    value={fontSize}
                    onChange={(e) => setFontOverride(Number(e.target.value))}
                    className="mt-2 w-full accent-[#4F6EF6]"
                  />
                </div>
              </>
            )}
          </div>

          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Reading settings"
              className="rounded-lg p-2 text-gray-700 transition hover:bg-black/5"
            >
              <Settings className="h-5 w-5" />
            </button>
            {showSettings && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSettings(false)}
                />
                <div className="absolute bottom-10 left-1/2 z-20 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="space-y-4">{settingsControls}</div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Reading settings"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-gray-700 transition hover:bg-black/5 md:hidden"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {!isFullscreen && (
          <p className="hidden text-xs text-gray-400 md:block">
            ← → or Space to play/pause · ↑ ↓ to adjust speed · F to toggle
            fullscreen
          </p>
        )}
      </div>

      {isFullscreen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-2 rounded-full border border-gray-300 bg-white/90 px-4 py-2 text-xs font-medium text-gray-700 shadow-lg backdrop-blur transition hover:bg-white"
          >
            <Minimize className="h-3.5 w-3.5" />
            Esc to exit
          </button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">
                Reading settings
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
                className="flex h-12 w-12 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5">{settingsControls}</div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmingDelete(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900">
              Delete document?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              “{title}” will be permanently removed. Shared links will stop
              working.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareModal}

      {resumePrompt && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-2xl">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Resume from word {resumePrompt.index.toLocaleString()}?
              </p>
              <p className="text-xs text-gray-500">
                Pick up where you left off, or start from the top.
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={handleResumeDismiss}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-black/5"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={handleResumeAccept}
                className="rounded-lg bg-[#4F6EF6] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({
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
      className="flex w-full items-center justify-between"
    >
      <span className="text-sm font-medium">{label}</span>
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

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
        danger ? "text-indigo-600 hover:bg-red-50" : "hover:bg-black/5",
      )}
    >
      {icon}
      {label}
    </button>
  );
}