"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Check,
  Eye,
  Loader2,
  PenLine,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import {
  canvasPartsToBlocks,
  escapeHtml,
  isBlockLevelElement,
  sanitizeEditorHtml,
  type CanvasPart,
} from "@/lib/editor";
import { saveDocumentContent, signDocumentImages } from "@/lib/documents-api";
import { IMAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import EditorToolbar, {
  type ToolbarCommand,
  type ToolbarState,
} from "@/components/editor/EditorToolbar";

/**
 * Word-style document editor with autosave and a live preview.
 *
 * The canvas is a contentEditable surface hydrated once from the server's
 * `blocksToCanvasHtml` output — React never re-renders its children (all
 * state changes live in sibling chrome), so the browser's undo stack and
 * caret survive every autosave. On input we debounce a save: the DOM is
 * serialized back into blocks, sanitized client-side, and PUT to the API
 * which sanitizes again, re-tokenizes words and replaces content_blocks.
 *
 * Layout: desktop shows editor + preview side by side; phones switch with
 * an Edit/Preview segmented control. The ribbon scrolls horizontally on
 * narrow screens instead of wrapping.
 */

export interface EditableDocument {
  id: string;
  slug: string;
  title: string;
}

type SaveState = "saved" | "dirty" | "saving" | "error";

/** Debounce before an autosave fires after the last keystroke. */
const AUTOSAVE_MS = 900;
/** Retry delay after a failed save. */
const RETRY_MS = 5000;
/** Debounce before the preview pane re-renders. */
const PREVIEW_MS = 250;
/** Client-side cap before upload (server caps total request size). */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/* Canvas serialization                                                */
/* ------------------------------------------------------------------ */

/** Walk top-level canvas children into parts the model understands. */
function serializeCanvas(editor: HTMLElement): CanvasPart[] {
  const parts: CanvasPart[] = [];
  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (!text.trim()) continue;
      parts.push({
        kind: "html",
        html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
      });
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    if (el.tagName === "FIGURE" && el.dataset.imagePath) {
      parts.push({ kind: "figure", path: el.dataset.imagePath });
      continue;
    }
    const html = el.outerHTML;
    parts.push({
      kind: "html",
      html: isBlockLevelElement(html) ? html : `<p>${html}</p>`,
    });
  }
  return parts;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DocumentEditor({
  document: doc,
  initialHtml,
  initialWordCount,
}: {
  document: EditableDocument;
  initialHtml: string;
  initialWordCount: number;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileModeRef = useRef<"insert" | "replace">("insert");
  const selectedFigureRef = useRef<HTMLElement | null>(null);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  /** Points at `flushSave` so timers can re-enter it without a TDZ cycle. */
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(initialWordCount);
  const [uploading, setUploading] = useState(false);
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [tools, setTools] = useState<ToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
    block: "p",
  });

  /* ---------------- toolbar state ---------------- */

  const syncToolbar = useCallback(() => {
    const stateOf = (command: string) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    };
    let block = "p";
    try {
      const raw = (document.queryCommandValue("formatBlock") || "")
        .toLowerCase()
        .replace(/[<>]/g, "")
        .trim();
      if (/^h[1-6]$/.test(raw) || raw === "p") block = raw;
    } catch {
      // queryCommandValue unsupported — keep Paragraph selected.
    }
    setTools({
      bold: stateOf("bold"),
      italic: stateOf("italic"),
      underline: stateOf("underline"),
      strike: stateOf("strikeThrough"),
      ul: stateOf("insertUnorderedList"),
      ol: stateOf("insertOrderedList"),
      block,
    });
  }, []);

  /* ---------------- preview ---------------- */

  const syncPreview = useCallback(() => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;
    preview.innerHTML = editor.innerHTML;
    preview
      .querySelectorAll("[contenteditable]")
      .forEach((n) => n.removeAttribute("contenteditable"));
    preview
      .querySelectorAll("figure.is-selected")
      .forEach((n) => n.classList.remove("is-selected"));
    preview
      .querySelectorAll("img")
      .forEach((img) => img.setAttribute("draggable", "false"));
  }, []);

  const schedulePreview = useCallback(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      syncPreview();
    }, PREVIEW_MS);
  }, [syncPreview]);

  /* ---------------- autosave ---------------- */

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (savingRef.current) {
      // A save is in flight; queue another pass for when it lands.
      saveTimerRef.current = setTimeout(() => void flushRef.current(), AUTOSAVE_MS);
      return;
    }
    if (!dirtyRef.current) return;
    const editor = editorRef.current;
    if (!editor) return;

    const blocks = canvasPartsToBlocks(serializeCanvas(editor));
    const fingerprint = JSON.stringify(blocks);
    if (fingerprint === lastSavedRef.current) {
      dirtyRef.current = false;
      setSaveState("saved");
      return;
    }

    savingRef.current = true;
    dirtyRef.current = false;
    setSaveState("saving");
    let failed = false;
    try {
      const result = await saveDocumentContent(doc.id, blocks);
      lastSavedRef.current = fingerprint;
      setWordCount(result.word_count);
      setLastSavedAt(new Date(result.saved_at));
      setSaveState("saved");
    } catch (err) {
      failed = true;
      dirtyRef.current = true;
      setSaveState("error");
      console.warn("Autosave failed:", err);
    } finally {
      savingRef.current = false;
      if (dirtyRef.current && !saveTimerRef.current) {
        saveTimerRef.current = setTimeout(
          () => void flushRef.current(),
          failed ? RETRY_MS : AUTOSAVE_MS,
        );
      }
    }
  }, [doc.id]);

  // Timers re-enter through the ref so `flushSave` never closes over itself.
  useEffect(() => {
    flushRef.current = flushSave;
  }, [flushSave]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushSave();
    }, AUTOSAVE_MS);
  }, [flushSave]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSaveState((current) => (current === "saving" ? current : "dirty"));
    scheduleSave();
  }, [scheduleSave]);

  /* ---------------- figure selection ---------------- */

  const clearFigureSelection = useCallback(() => {
    const editor = editorRef.current;
    editor
      ?.querySelectorAll("figure.is-selected")
      .forEach((f) => f.classList.remove("is-selected"));
    selectedFigureRef.current = null;
    setHasSelectedImage(false);
  }, []);

  const selectFigure = useCallback((figure: HTMLElement | null) => {
    const editor = editorRef.current;
    editor
      ?.querySelectorAll("figure.is-selected")
      .forEach((f) => f.classList.remove("is-selected"));
    if (figure && figure.isConnected) {
      figure.classList.add("is-selected");
      selectedFigureRef.current = figure;
      setHasSelectedImage(true);
    } else {
      selectedFigureRef.current = null;
      setHasSelectedImage(false);
    }
  }, []);

  /* ---------------- images ---------------- */

  const openImagePicker = useCallback((mode: "insert" | "replace") => {
    fileModeRef.current = mode;
    fileInputRef.current?.click();
  }, []);

  const insertFigure = useCallback(
    (path: string, url: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      const html =
        `<figure data-image-path="${path.replace(/"/g, "&quot;")}" contenteditable="false">` +
        `<img src="${url.replace(/"/g, "&quot;")}" alt="Document figure" loading="lazy" /></figure>` +
        `<p><br></p>`;
      const selection = window.getSelection();
      const inEditor =
        selection &&
        selection.rangeCount > 0 &&
        selection.anchorNode &&
        editor.contains(selection.anchorNode);
      let inserted = false;
      if (inEditor) {
        try {
          inserted = document.execCommand("insertHTML", false, html);
        } catch {
          inserted = false;
        }
      }
      if (!inserted) {
        // iOS/Safari occasionally refuses insertHTML — place at the caret
        // range directly, or append when the selection left the canvas.
        if (inEditor && selection) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const temp = document.createElement("div");
          temp.innerHTML = html;
          const fragment = document.createDocumentFragment();
          while (temp.firstChild) fragment.appendChild(temp.firstChild);
          range.insertNode(fragment);
        } else {
          editor.insertAdjacentHTML("beforeend", html);
        }
      }
      markDirty();
      schedulePreview();
    },
    [markDirty, schedulePreview],
  );

  const handleFileChosen = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Pick an image file (PNG, JPG, WebP…)");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Image is too large (max 8 MB)");
        return;
      }
      setUploading(true);
      try {
        const supabase = createClient();
        const safeName =
          (file.name || "image").replace(/[^\w.-]+/g, "_").slice(-64) || "image.png";
        const path = `${doc.id}/editor_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}_${safeName}`;
        const { error } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type || "image/png",
          });
        if (error) throw new Error(error.message);

        const { urls } = await signDocumentImages(doc.id, [path]);
        const url = urls[path];
        if (!url) throw new Error("Could not sign the uploaded image");

        if (fileModeRef.current === "replace" && selectedFigureRef.current) {
          const figure = selectedFigureRef.current;
          if (!figure.isConnected) throw new Error("Selected image is gone");
          figure.dataset.imagePath = path;
          const img = figure.querySelector("img");
          if (img) img.src = url;
          selectFigure(figure);
          markDirty();
          schedulePreview();
        } else {
          insertFigure(path, url);
        }
        toast.success("Image added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [doc.id, insertFigure, markDirty, schedulePreview, selectFigure],
  );

  const removeSelectedImage = useCallback(() => {
    const figure = selectedFigureRef.current;
    if (figure?.isConnected) figure.remove();
    selectedFigureRef.current = null;
    setHasSelectedImage(false);
    markDirty();
    schedulePreview();
    toast.success("Image removed");
  }, [markDirty, schedulePreview]);

  /* ---------------- toolbar commands ---------------- */

  const exec = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus();
      try {
        document.execCommand(command, false, value);
      } catch {
        // Command unsupported in this browser — harmless no-op.
      }
      syncToolbar();
      markDirty();
      schedulePreview();
    },
    [markDirty, schedulePreview, syncToolbar],
  );

  const runCommand = useCallback(
    (command: ToolbarCommand) => {
      if (command === "createLink") {
        const url = window.prompt("Link URL");
        if (!url) return;
        const trimmed = url.trim();
        const safe =
          /^https?:\/\//i.test(trimmed) ||
          /^mailto:/i.test(trimmed) ||
          (trimmed.startsWith("/") && !trimmed.startsWith("//")) ||
          trimmed.startsWith("#");
        if (!safe) {
          toast.error("Links must start with http://, https:// or /");
          return;
        }
        exec("createLink", trimmed);
        return;
      }
      exec(command);
    },
    [exec],
  );

  const applyBlock = useCallback(
    (tag: string) => {
      // formatBlock wants a full tag string across browsers.
      exec("formatBlock", `<${tag}>`);
    },
    [exec],
  );

  /* ---------------- mount / lifecycle ---------------- */

  useEffect(() => {
    // Paragraphs on Enter, Word-style.
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // Not supported — browsers fall back to their own default.
    }
    syncPreview();

    const onSelectionChange = () => {
      const selection = document.getSelection();
      const editor = editorRef.current;
      if (!editor || !selection || !selection.anchorNode) return;
      if (!editor.contains(selection.anchorNode)) return;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        syncToolbar();
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current) {
        void flushSave();
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || savingRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      // Last-chance flush so closing the tab mid-debounce loses nothing.
      if (dirtyRef.current) void flushSave();
    };
  }, [flushSave, syncPreview, syncToolbar]);

  /* ---------------- canvas interaction ---------------- */

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const figure = target.closest(
      "figure[data-image-path]",
    ) as HTMLElement | null;
    if (figure && editorRef.current?.contains(figure)) {
      selectFigure(figure);
    } else {
      clearFigureSelection();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    e.preventDefault();
    if (html) {
      document.execCommand("insertHTML", false, sanitizeEditorHtml(html));
    } else if (text) {
      document.execCommand("insertText", false, text);
    }
    markDirty();
    schedulePreview();
  };

  /* ---------------- status chrome ---------------- */

  const statusPill = (() => {
    switch (saveState) {
      case "saving":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-muted">
            <Loader2 className="h-3 w-3 animate-spin text-accent" />
            Saving…
          </span>
        );
      case "dirty":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Unsaved
          </span>
        );
      case "error":
        return (
          <button
            type="button"
            onClick={() => void flushSave()}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{
              background: "var(--color-danger-soft)",
              color: "var(--color-danger)",
            }}
          >
            <TriangleAlert className="h-3 w-3" />
            Save failed — retry
            <RefreshCw className="h-3 w-3" />
          </button>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent"
            title={
              lastSavedAt
                ? `Last saved ${lastSavedAt.toLocaleTimeString()}`
                : undefined
            }
          >
            <Check className="h-3 w-3" />
            {lastSavedAt ? "Saved" : "All changes saved"}
          </span>
        );
    }
  })();

  /* ---------------- render ---------------- */

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-bg text-ink">
      {/* Header */}
      <header
        className="z-40 shrink-0 border-b border-line bg-bg/90 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-14 items-center gap-2.5 px-3 sm:px-4">
          <Link
            href="/library"
            aria-label="Back to library"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-soft hover:text-ink"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{doc.title}</p>
            <p className="hidden text-[11px] font-medium text-subtle tabular-nums sm:block">
              Editing · {wordCount.toLocaleString()} words
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden sm:block">{statusPill}</span>
            <Link
              href={`/c/${doc.slug}`}
              className="btn btn-primary btn-sm !px-3.5 !py-2 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open in reader</span>
              <span className="sm:hidden">Read</span>
            </Link>
          </div>
        </div>

        {/* Mobile-only status row */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2 sm:hidden">
          {statusPill}
          <span className="text-[11px] font-medium text-subtle tabular-nums">
            {wordCount.toLocaleString()} words
          </span>
        </div>

        <EditorToolbar
          state={tools}
          onCommand={runCommand}
          onBlockChange={applyBlock}
          onInsertImage={() => openImagePicker("insert")}
          onReplaceImage={() => openImagePicker("replace")}
          onRemoveImage={removeSelectedImage}
          hasSelectedImage={hasSelectedImage}
          uploading={uploading}
        />

        {/* Mobile Edit / Preview switch */}
        <div className="flex gap-1 border-t border-line p-2 lg:hidden">
          {(
            [
              ["edit", "Edit", PenLine],
              ["preview", "Preview", Eye],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMobileView(id);
                if (id === "preview") syncPreview();
              }}
              aria-pressed={mobileView === id}
              className={clsx(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
                mobileView === id
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-soft hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Body: editor + preview panes */}
      <main className="grid min-h-0 flex-1 lg:grid-cols-2">
        {/* Editor pane */}
        <section
          className={clsx(
            "min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:border-r lg:border-line",
            mobileView === "edit" ? "block" : "hidden",
            "lg:block",
          )}
          aria-label="Editing canvas"
        >
          <div className="doc-sheet mx-auto max-w-3xl p-5 sm:p-9 lg:p-11">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Document body"
              spellCheck
              data-placeholder="Start writing — your changes save automatically…"
              className="doc-canvas min-h-[50vh] sm:min-h-[60vh]"
              // Hydrated once; React never touches these children again.
              dangerouslySetInnerHTML={{ __html: initialHtml }}
              onInput={() => {
                markDirty();
                schedulePreview();
              }}
              onClick={handleCanvasClick}
              onPaste={handlePaste}
              onBlur={() => {
                if (dirtyRef.current) void flushSave();
              }}
            />
          </div>
        </section>

        {/* Preview pane */}
        <section
          className={clsx(
            "min-h-0 overflow-y-auto bg-surface-soft/40 px-3 py-4 sm:px-6 sm:py-6",
            mobileView === "preview" ? "block" : "hidden",
            "lg:block",
          )}
          aria-label="Document preview"
        >
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
                Preview
              </span>
              <span className="text-[11px] font-medium text-subtle tabular-nums">
                {wordCount.toLocaleString()} words · {lastSavedAt ? "autosaved" : "ready"}
              </span>
            </div>
            <div className="doc-sheet p-5 sm:p-9 lg:p-11">
              <div
                ref={previewRef}
                className="doc-canvas doc-preview"
                // Live copy of the canvas, refreshed on a debounce.
                dangerouslySetInnerHTML={{ __html: initialHtml }}
              />
            </div>
          </div>
        </section>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFileChosen(file);
        }}
      />
    </div>
  );
}
