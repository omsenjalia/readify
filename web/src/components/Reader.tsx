"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BookOpen, Minimize, X } from "lucide-react";

import {
  getLocalProgress,
  setLocalProgress,
  setRemoteProgress,
  subscribeToLocalProgress,
} from "@/lib/progress";
import {
  deleteDocument,
  reprocessDocument,
  updateDocument,
} from "@/lib/documents-api";
import type { ReadItem } from "@/lib/flatten";
import type { ReaderPrefs } from "@/lib/constants";
import { WPM_MAX, WPM_MIN, WPM_STEP } from "@/lib/constants";
import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useReaderSettings } from "@/hooks/useReaderSettings";

import ShareModal, { type ReaderShareDoc } from "@/components/ShareModal";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderProgressBar from "@/components/reader/ReaderProgressBar";
import ReaderControls, {
  type ReaderPanel,
} from "@/components/reader/ReaderControls";
import WordStage from "@/components/reader/WordStage";
import ImageStage from "@/components/reader/ImageStage";
import DwellOverlay from "@/components/reader/DwellOverlay";
import SettingsPanel from "@/components/reader/SettingsPanel";

export interface ReaderDocument {
  id: string;
  title: string;
  visibility: string;
  user_id: string | null;
  slug: string;
}

export interface ReaderProps {
  document: ReaderDocument;
  items: ReadItem[];
  isOwner: boolean;
  isSignedIn: boolean;
  userId: string | null;
  preferences: ReaderPrefs | null;
  initialIndex?: number;
  initialWpm?: number;
}

function clampWpm(value: number): number {
  return Math.min(WPM_MAX, Math.max(WPM_MIN, value));
}

/**
 * RSVP reader.
 *
 * Previously a single 1,400-line component that owned the playback state
 * machine, progress persistence, preference persistence, four popovers and
 * every piece of markup. The pieces now live in:
 *
 *  - `lib/reader-engine.ts`      pure playback transitions (unit tested)
 *  - `hooks/useReaderEngine`     timers + progress saves
 *  - `hooks/useReaderSettings`   speed / font / theme / toggles + persistence
 *  - `components/reader/*`       presentation
 *
 * What remains here is composition plus the document-level actions.
 */
export default function ReaderClient({
  document: doc,
  items,
  isOwner,
  isSignedIn,
  userId,
  preferences,
  initialIndex = 0,
  initialWpm = 800,
}: ReaderProps) {
  const router = useRouter();

  const settings = useReaderSettings({ preferences, initialWpm, userId });

  /* ---------------- document-level state ---------------- */

  const [title, setTitle] = useState(doc.title);
  const [visibility, setVisibility] = useState(doc.visibility);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<ReaderPanel | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSection, setShareSection] = useState<"link" | "visibility">(
    "link",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** Set once the reader dismisses or accepts the resume prompt. */
  const [resumeResolved, setResumeResolved] = useState(false);

  const isPublic = visibility === "public";
  const ownerId = isOwner ? doc.user_id : null;

  /* ---------------- progress persistence ---------------- */

  /**
   * Signed-in progress is loaded server-side and arrives as `initialIndex`, so
   * only anonymous readers need the localStorage fallback. The reader used to
   * re-fetch both progress and preferences from Supabase on mount even though
   * the page had already provided them.
   */
  const saveProgress = useCallback(
    (index: number, wpm: number) => {
      if (!userId) {
        setLocalProgress(doc.slug, index, wpm);
        return;
      }
      setRemoteProgress(doc.id, userId, index, wpm).catch((err) =>
        console.warn("Readify sync failed:", err),
      );
    },
    [userId, doc.id, doc.slug],
  );

  const engine = useReaderEngine({
    items,
    wpm: settings.wpm,
    autoPauseImages: settings.autoPauseImages,
    initialIndex,
    onSaveProgress: saveProgress,
  });

  const { seek } = engine;
  const { setWpm } = settings;

  /**
   * Anonymous readers keep their position in localStorage, which is only
   * readable on the client. Reading it through `useSyncExternalStore` (with a
   * `0` server snapshot) means the first client render still matches the
   * server, and no state has to be written from an effect.
   */
  const localResumeIndex = useSyncExternalStore(
    subscribeToLocalProgress,
    () => {
      const local = getLocalProgress(doc.slug);
      return local && local.index > 0 ? local.index : 0;
    },
    () => 0,
  );

  // Signed-in readers get their position from the server-rendered prop.
  const resumeAt = useMemo(() => {
    if (resumeResolved) return null;
    const index = userId ? initialIndex : localResumeIndex;
    return index > 0
      ? Math.min(index, Math.max(items.length - 1, 0))
      : null;
  }, [resumeResolved, userId, initialIndex, localResumeIndex, items.length]);

  // Anonymous readers also need their engine moved to the stored position.
  // This is a sync-to-external-system effect, not derived state.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || userId || localResumeIndex <= 0) return;
    restoredRef.current = true;

    const local = getLocalProgress(doc.slug);
    if (!local) return;
    seek(Math.min(local.index, Math.max(items.length - 1, 0)));
    setWpm(local.wpm);
  }, [userId, localResumeIndex, doc.slug, items.length, seek, setWpm]);

  /* ---------------- derived readout ---------------- */

  /**
   * Word counts come from a prefix sum computed once per document, because the
   * reader re-renders on every tick (up to ~13 times a second at 800 WPM). The
   * old code ran `items.filter(...)` plus `items.slice(0, index + 1).filter(...)`
   * on *every* render, allocating an array as long as the current position.
   */
  const wordCounts = useMemo(() => {
    const prefix = new Uint32Array(items.length + 1);
    for (let i = 0; i < items.length; i++) {
      prefix[i + 1] = prefix[i] + (items[i].kind === "word" ? 1 : 0);
    }
    return prefix;
  }, [items]);

  const totalWords = wordCounts[items.length] ?? 0;
  const wordsRead = wordCounts[Math.min(engine.index + 1, items.length)] ?? 0;
  const wordsLeft = Math.max(0, totalWords - wordsRead);
  const percent =
    totalWords > 0
      ? Math.min(100, Math.round((wordsRead / totalWords) * 100))
      : 0;
  const minutesLeft = settings.wpm > 0 ? Math.ceil(wordsLeft / settings.wpm) : 0;

  const shareDoc: ReaderShareDoc = useMemo(
    () => ({
      id: doc.id,
      slug: doc.slug,
      title,
      visibility: isPublic ? "public" : "private",
      wordCount: totalWords,
      readMinutes: Math.max(
        1,
        Math.round(totalWords / Math.max(settings.wpm, 1)),
      ),
    }),
    [doc.id, doc.slug, title, isPublic, totalWords, settings.wpm],
  );

  const currentItem = items[engine.index];
  const prevItem = engine.index > 0 ? items[engine.index - 1] : undefined;
  const nextItem = items[engine.index + 1];

  /* ---------------- fullscreen ---------------- */

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ---------------- keyboard shortcuts ---------------- */

  const { togglePlay, step, resume } = engine;

  // Current speed, read by the key handler so ArrowUp/Down can report the
  // clamped value without re-subscribing on every speed change.
  const wpmRef = useRef(settings.wpm);
  useEffect(() => {
    wpmRef.current = settings.wpm;
  });

  useEffect(() => {
    const nudgeSpeed = (delta: number) => {
      const next = clampWpm(wpmRef.current + delta);
      setWpm(next);
      toast.success(`${next} WPM`, { id: "reader-wpm" });
    };

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

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          step(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          step(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          nudgeSpeed(WPM_STEP);
          break;
        case "ArrowDown":
          e.preventDefault();
          nudgeSpeed(-WPM_STEP);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, step, setWpm, toggleFullscreen]);

  /* ---------------- document actions ---------------- */

  function openShare(section: "link" | "visibility") {
    setShareSection(section);
    setShareOpen(true);
    setMenuOpen(false);
  }

  async function commitRename() {
    const next = renameValue.trim() || doc.title;
    setTitle(next);
    setRenaming(false);
    if (!ownerId || next === doc.title) return;

    try {
      await updateDocument(doc.id, { title: next });
    } catch (err) {
      setTitle(doc.title);
      console.warn("Rename failed:", err);
      toast.error("Couldn't rename document");
    }
  }

  async function handleReprocess() {
    if (!isOwner || reprocessing) return;
    setReprocessing(true);
    setMenuOpen(false);
    try {
      await reprocessDocument(doc.id);
      toast.success("Reprocessing… refresh shortly");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reprocess failed");
    } finally {
      setReprocessing(false);
    }
  }

  async function handleDelete() {
    if (!ownerId) return;
    setDeleting(true);
    try {
      // Via the API route so extracted images and the original upload are
      // cleaned up too — deleting the row directly orphaned every object.
      await deleteDocument(doc.id);
      router.push("/library");
    } catch (err) {
      setDeleting(false);
      setConfirmingDelete(false);
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete document",
      );
    }
  }

  function acceptResume() {
    if (resumeAt === null) return;
    setResumeResolved(true);
    toast.success(`Resumed from word ${resumeAt.toLocaleString()}`);
  }

  function dismissResume() {
    seek(0);
    setResumeResolved(true);
    toast("Started from the beginning");
  }

  /* ---------------- render ---------------- */

  const header = (
    <ReaderHeader
      title={title}
      isOwner={isOwner}
      isPublic={isPublic}
      isSignedIn={isSignedIn}
      homeHref={userId ? "/library" : "/"}
      menuOpen={menuOpen}
      onToggleMenu={() => setMenuOpen((v) => !v)}
      onCloseMenu={() => setMenuOpen(false)}
      renaming={renaming}
      renameValue={renameValue}
      onRenameValueChange={setRenameValue}
      onStartRename={() => {
        setRenameValue(title);
        setRenaming(true);
      }}
      onCommitRename={() => void commitRename()}
      onCancelRename={() => setRenaming(false)}
      onShare={() => openShare("link")}
      onToggleVisibility={() => openShare("visibility")}
      onReprocess={() => void handleReprocess()}
      reprocessing={reprocessing}
      onDelete={() => {
        setMenuOpen(false);
        setConfirmingDelete(true);
      }}
    />
  );

  const shareModal = (
    <ShareModal
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      doc={shareDoc}
      initialSection={shareSection}
      onVisibilityChange={setVisibility}
    />
  );

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        {header}
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
      {!isFullscreen && header}

      {settings.showProgressBar && (
        <ReaderProgressBar
          percent={percent}
          wordsLeft={wordsLeft}
          minutesLeft={minutesLeft}
          index={engine.index}
          total={items.length}
        />
      )}

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        {currentItem?.kind === "image" ? (
          <ImageStage url={currentItem.url}>
            {engine.dwell === "image" && settings.autoPauseImages && (
              <DwellOverlay
                state={engine.state}
                label="Figure pause"
                onContinue={resume}
              />
            )}
          </ImageStage>
        ) : (
          <>
            <WordStage
              current={currentItem}
              previous={prevItem}
              next={nextItem}
              fontSize={settings.fontSize}
              highlightOrp={settings.highlightOrp}
            />
            {engine.dwell === "math" && (
              <DwellOverlay
                state={engine.state}
                label="Formula pause"
                onContinue={resume}
              />
            )}
          </>
        )}
      </main>

      <div className="flex flex-col items-center gap-3 pb-6 pt-2">
        <ReaderControls
          settings={settings}
          playing={engine.playing}
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
          onStep={step}
          onTogglePlay={togglePlay}
        />

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

      {/* Mobile settings sheet — the desktop equivalent is a popover. */}
      {openPanel === "settings" && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenPanel(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reading settings"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-8 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">
                Reading settings
              </span>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                aria-label="Close settings"
                className="flex h-12 w-12 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5">
              <SettingsPanel settings={settings} />
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDeleteDialog
          title={title}
          deleting={deleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}

      {shareModal}

      {resumeAt !== null && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-2xl">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Resume from word {resumeAt.toLocaleString()}?
              </p>
              <p className="text-xs text-gray-500">
                Pick up where you left off, or start from the top.
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={dismissResume}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-black/5"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={acceptResume}
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
