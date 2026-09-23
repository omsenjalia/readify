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
import { BookOpen, Minimize } from "lucide-react";

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
import type { ReaderPrefs, ReadingMode } from "@/lib/constants";
import { PREFERENCE_DEFAULTS, WPM_MAX, WPM_MIN, WPM_STEP } from "@/lib/constants";
import { intervalMsForWpm } from "@/lib/reader-engine";
import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import { useReadingMode } from "@/hooks/useReadingMode";

import ShareModal, { type ReaderShareDoc } from "@/components/ShareModal";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderProgressBar from "@/components/reader/ReaderProgressBar";
import ReaderControls, {
  type ReaderPanel,
} from "@/components/reader/ReaderControls";
import LineStage from "@/components/reader/LineStage";
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

/* ------------------------------------------------------------------ */
/* Touch gestures                                                      */
/* ------------------------------------------------------------------ */

/** Horizontal travel past which a touch becomes a swipe, in px. */
const SWIPE_THRESHOLD = 44;
/** Travel/duration under which a touch counts as a tap. */
const TAP_MAX_MOVE = 12;
const TAP_MAX_MS = 400;

interface GestureHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

function haptic(ms = 8): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported / not allowed — purely cosmetic.
  }
}

/**
 * Mobile-first stage gestures:
 *
 *  - swipe left  → next word
 *  - swipe right → previous word
 *  - tap the left third → previous word
 *  - tap the right third → next word
 *  - tap the middle → play/pause
 *
 * Desktop keeps the keyboard shortcuts; both paths funnel into the same
 * engine actions.
 */
function useStageGestures(
  ref: React.RefObject<HTMLElement | null>,
  {
    onStep,
    onTogglePlay,
  }: { onStep: (delta: number) => void; onTogglePlay: () => void },
): GestureHandlers {
  const start = useRef<{ x: number; y: number; t: number; swiped: boolean }>({
    x: 0,
    y: 0,
    t: 0,
    swiped: false,
  });

  return useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent) => {
        start.current = { x: e.clientX, y: e.clientY, t: Date.now(), swiped: false };
      },
      onPointerMove: (e: React.PointerEvent) => {
        const s = start.current;
        if (s.swiped) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.4) {
          s.swiped = true;
          haptic();
          onStep(dx < 0 ? 1 : -1);
        }
      },
      onPointerUp: (e: React.PointerEvent) => {
        const s = start.current;
        if (s.swiped) return;
        const dt = Date.now() - s.t;
        const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
        if (dt > TAP_MAX_MS || dist > TAP_MAX_MOVE) return;

        const rect = ref.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return;
        const ratio = (e.clientX - rect.left) / rect.width;

        haptic();
        if (ratio < 0.3) onStep(-1);
        else if (ratio > 0.7) onStep(1);
        else onTogglePlay();
      },
      onPointerCancel: () => {
        start.current.swiped = true;
      },
    }),
    [ref, onStep, onTogglePlay],
  );
}

/* ------------------------------------------------------------------ */
/* Reader                                                              */
/* ------------------------------------------------------------------ */

/**
 * RSVP reader.
 *
 * The playback state machine lives in `lib/reader-engine.ts` (pure, unit
 * tested); timers and persistence in `hooks/useReaderEngine`; presentation
 * settings in `hooks/useReaderSettings`; the two display modes in
 * `components/reader/LineStage` (whole-line sliding focus) and
 * `components/reader/WordStage` (classic single word). What remains here is
 * composition, gestures, and the document-level actions.
 */
export default function ReaderClient({
  document: doc,
  items,
  isOwner,
  isSignedIn,
  userId,
  preferences,
  initialIndex = 0,
  initialWpm = PREFERENCE_DEFAULTS.default_wpm,
}: ReaderProps) {
  const router = useRouter();

  const settings = useReaderSettings({ preferences, initialWpm, userId });
  const [mode, setMode] = useReadingMode();

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
   * only anonymous readers need the localStorage fallback.
   */
  const saveProgress = useCallback(
    (index: number, wpm: number) => {
      if (!userId) {
        setLocalProgress(doc.slug, index, wpm);
        return;
      }
      setRemoteProgress(doc.id, userId, index, wpm).catch((err) =>
        console.warn("Readio sync failed:", err),
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
   * reader re-renders on every tick (up to ~13 times a second at 800 WPM).
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

  // The key handler reads the mode through a ref so switching modes does not
  // re-subscribe the global listener.
  const modeRef = useRef<ReadingMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
        case "m":
        case "M":
          setMode(modeRef.current === "line" ? "word" : "line");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, step, setWpm, toggleFullscreen, setMode]);

  /* ---------------- touch gestures ---------------- */

  const stageRef = useRef<HTMLElement | null>(null);
  const gestures = useStageGestures(stageRef, {
    onStep: step,
    onTogglePlay: togglePlay,
  });

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

  const handleModeChange = useCallback(
    (next: ReadingMode) => {
      setMode(next);
      toast.success(next === "line" ? "Line Flow" : "One word at a time", {
        id: "reader-mode",
      });
    },
    [setMode],
  );

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
      <div className="flex min-h-dvh flex-col bg-bg text-ink">
        {header}
        <main className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <BookOpen className="mx-auto h-10 w-10 text-subtle" />
            <p className="mt-3 text-sm text-muted">
              This document has no readable content yet.
            </p>
          </div>
        </main>
        {shareModal}
      </div>
    );
  }

  const isImageItem = currentItem?.kind === "image";
  const stepMs = intervalMsForWpm(settings.wpm);

  return (
    <div className="glow-radial relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-bg text-ink">
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

      {/* Stage — tap and swipe zones cover the whole reading area. */}
      <main
        ref={stageRef}
        {...gestures}
        className="flex flex-1 touch-pan-y flex-col items-center justify-center overflow-hidden px-3 sm:px-4"
      >
        {isImageItem ? (
          <ImageStage url={(currentItem as { kind: "image"; url: string }).url}>
            {engine.dwell === "image" && settings.autoPauseImages && (
              <DwellOverlay
                state={engine.state}
                label="Figure pause"
                onContinue={resume}
              />
            )}
          </ImageStage>
        ) : mode === "line" ? (
          <div className="flex w-full max-w-4xl flex-col items-center">
            <LineStage
              items={items}
              index={engine.index}
              fontSize={settings.fontSize}
              highlightOrp={settings.highlightOrp}
              stepMs={stepMs}
            />
            {engine.dwell === "math" && (
              <DwellOverlay
                state={engine.state}
                label="Formula pause"
                onContinue={resume}
              />
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center">
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
          </div>
        )}
      </main>

      {/* Controls dock */}
      <div
        className="flex flex-col items-center gap-2 border-t border-line bg-bg/80 px-3 pb-4 pt-3 backdrop-blur-md sm:pb-5"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
      >
        <ReaderControls
          settings={settings}
          playing={engine.playing}
          mode={mode}
          onModeChange={handleModeChange}
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
          onStep={step}
          onTogglePlay={togglePlay}
          onReset={() => {
            seek(0);
            toast.success("Back to the beginning", { id: "reader-reset" });
          }}
          onFullscreen={toggleFullscreen}
        />

        {!isFullscreen && (
          <p className="hidden text-[11px] font-medium text-subtle md:block">
            Space play/pause · ← → step · ↑ ↓ speed · M mode · F fullscreen
            {mode === "line" && " · on touch: swipe or tap the edges"}
          </p>
        )}
      </div>

      {isFullscreen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="btn btn-outline !border-line bg-bg-elevated/90 !px-4 !py-2 text-xs backdrop-blur"
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
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpenPanel(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reading settings"
            className="sheet-in absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-bg-elevated p-5 shadow-2xl"
            style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom, 1.75rem))" }}
          >
            <div
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong"
              aria-hidden="true"
            />
            <div className="mb-5 flex items-center justify-between">
              <span className="text-base font-bold text-ink">
                Reading settings
              </span>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                aria-label="Close settings"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-sm font-bold text-muted transition active:scale-95"
              >
                ✕
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
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-line bg-bg-elevated p-4 shadow-2xl">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">
                Resume from word {resumeAt.toLocaleString()}?
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Pick up where you left off, or start from the top.
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={dismissResume}
                className="btn btn-ghost btn-sm text-xs"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={acceptResume}
                className="btn btn-primary btn-sm text-xs"
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
