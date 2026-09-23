"use client";

import clsx from "clsx";
import {
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Redo2,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";

/**
 * Word-style formatting ribbon for the editing canvas.
 *
 * Every button preserves the current selection (`onMouseDown` preventDefault)
 * so `execCommand` applies to what the user highlighted — the same model
 * Word and Google Docs use. On phones the ribbon scrolls horizontally
 * instead of wrapping, keeping one-row density like the desktop.
 */

export type ToolbarCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "undo"
  | "redo"
  | "removeFormat"
  | "createLink"
  | "unlink";

export interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  ul: boolean;
  ol: boolean;
  /** Current block tag under the caret: `p`, `h1`, `h2`, `h3`, … */
  block: string;
}

interface Props {
  state: ToolbarState;
  onCommand: (command: ToolbarCommand) => void;
  onBlockChange: (tag: string) => void;
  onInsertImage: () => void;
  onReplaceImage: () => void;
  onRemoveImage: () => void;
  hasSelectedImage: boolean;
  uploading: boolean;
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
  danger,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the caret where it is — buttons must not steal focus.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
        "disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "text-danger hover:bg-danger-soft"
          : active
            ? "bg-accent-soft text-accent"
            : "text-muted hover:bg-surface-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />;
}

export default function EditorToolbar({
  state,
  onCommand,
  onBlockChange,
  onInsertImage,
  onReplaceImage,
  onRemoveImage,
  hasSelectedImage,
  uploading,
}: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-0.5 overflow-x-auto border-b border-line bg-bg-elevated px-2 py-1.5 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden"
    >
      <ToolButton label="Undo" onClick={() => onCommand("undo")}>
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Redo" onClick={() => onCommand("redo")}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>

      <Divider />

      {/* Block style — a select mirrors Word's style dropdown and is the
          most touch-friendly control on phones. */}
      <select
        aria-label="Paragraph style"
        value={
          state.block === "h1" || state.block === "h2" || state.block === "h3"
            ? state.block
            : "p"
        }
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onBlockChange(e.target.value)}
        className="mr-1 h-9 shrink-0 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none transition hover:border-line-strong focus-visible:border-accent"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Title</option>
        <option value="h2">Heading</option>
        <option value="h3">Subheading</option>
      </select>

      <Divider />

      <ToolButton
        label="Bold"
        active={state.bold}
        onClick={() => onCommand("bold")}
      >
        <Bold className="h-4 w-4" strokeWidth={2.5} />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={state.italic}
        onClick={() => onCommand("italic")}
      >
        <Italic className="h-4 w-4" strokeWidth={2.5} />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={state.underline}
        onClick={() => onCommand("underline")}
      >
        <Underline className="h-4 w-4" strokeWidth={2.5} />
      </ToolButton>
      <ToolButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => onCommand("strikeThrough")}
      >
        <Strikethrough className="h-4 w-4" strokeWidth={2.5} />
      </ToolButton>

      <Divider />

      <span className="hidden shrink-0 items-center gap-0.5 sm:flex">
        <ToolButton
          label="Heading 1"
          active={state.block === "h1"}
          onClick={() => onBlockChange("h1")}
        >
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Heading 2"
          active={state.block === "h2"}
          onClick={() => onBlockChange("h2")}
        >
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Heading 3"
          active={state.block === "h3"}
          onClick={() => onBlockChange("h3")}
        >
          <Heading3 className="h-4 w-4" />
        </ToolButton>
      </span>

      <ToolButton
        label="Bulleted list"
        active={state.ul}
        onClick={() => onCommand("insertUnorderedList")}
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={state.ol}
        onClick={() => onCommand("insertOrderedList")}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton label="Insert link" onClick={() => onCommand("createLink")}>
        <LinkIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Remove link" onClick={() => onCommand("unlink")}>
        <Eraser className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton label="Insert image" onClick={onInsertImage} disabled={uploading}>
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </ToolButton>

      {hasSelectedImage && (
        <>
          <ToolButton label="Replace image" onClick={onReplaceImage} disabled={uploading}>
            <ImageIcon className="h-4 w-4 text-accent" />
          </ToolButton>
          <ToolButton label="Delete image" onClick={onRemoveImage} danger>
            <Trash2 className="h-4 w-4" />
          </ToolButton>
        </>
      )}

      <Divider />

      <ToolButton label="Clear formatting" onClick={() => onCommand("removeFormat")}>
        <span className="text-xs font-bold tracking-tight">T̲x</span>
      </ToolButton>
    </div>
  );
}
