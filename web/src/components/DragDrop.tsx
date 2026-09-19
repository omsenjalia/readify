"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { Upload, X } from "lucide-react";
import clsx from "clsx";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE,
  SUPPORTED_EXTENSIONS,
} from "@/lib/constants";
import { formatBytes } from "@/lib/format";

const ACCEPT_MAP: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".epub": ["application/epub+zip"],
};

function extAccepted(file: File, accept: string): boolean {
  if (!accept) return true;
  const acceptExts = accept.split(",").map((s) => s.trim());
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  for (const pattern of acceptExts) {
    if (pattern === ext) return true;
    const mimeTypes = ACCEPT_MAP[pattern];
    if (mimeTypes?.includes(file.type)) return true;
  }
  return false;
}

export default function DragDrop({
  onFiles,
  accept = ACCEPT_ATTRIBUTE,
  maxFiles = MAX_FILES_PER_UPLOAD,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
}) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File[]>([]);
  const [validateError, setValidateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const rejected = arr.filter(
        (f) => f.size > MAX_FILE_SIZE || (accept && !extAccepted(f, accept)),
      );
      if (rejected.length > 0) {
        const tooBig = rejected.some((f) => f.size > MAX_FILE_SIZE);
        setValidateError(
          tooBig
            ? `One or more files exceed the ${formatBytes(MAX_FILE_SIZE)} limit.`
            : `Only ${accept.replaceAll(",", ", ")} files are supported.`,
        );
      } else {
        setValidateError(null);
      }
      const valid = arr.filter(
        (f) =>
          f.size <= MAX_FILE_SIZE && (!accept || extAccepted(f, accept)),
      );
      const next = [...selected, ...valid].slice(0, maxFiles);
      setSelected(next);
      onFiles(next);
    },
    [selected, accept, maxFiles, onFiles],
  );

  const remove = (index: number) => {
    const next = selected.filter((_, i) => i !== index);
    setSelected(next);
    onFiles(next);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10",
          dragging
            ? "border-accent bg-accent-soft"
            : "border-line-strong hover:border-accent/60 hover:bg-surface-soft/60",
        )}
      >
        <span
          className={clsx(
            "mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl transition",
            dragging ? "bg-accent text-on-accent" : "bg-accent-soft text-accent",
          )}
        >
          <Upload className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="text-sm font-bold text-ink">
          Drop your files here or click to browse
        </p>
        <p className="mt-1.5 text-xs text-muted">
          Supported: {SUPPORTED_EXTENSIONS.join(", ").toUpperCase()} · Max{" "}
          {formatBytes(MAX_FILE_SIZE)} each · Up to {maxFiles} files
        </p>
      </div>

      {validateError && (
        <p
          className="mt-3 rounded-xl px-3.5 py-2.5 text-sm font-medium"
          style={{
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
          }}
          role="alert"
        >
          {validateError}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      {selected.length > 0 && (
        <ul className="mt-3 space-y-2">
          {selected.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-soft/60 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {file.name}
                </p>
                <p className="text-xs text-muted tabular-nums">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-subtle transition hover:bg-danger-soft hover:text-danger"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
