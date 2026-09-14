"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { Upload, X } from "lucide-react";
import clsx from "clsx";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  accept = ".pdf,.docx,.txt,.md,.epub",
  maxFiles = 5,
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
            ? "One or more files exceed the 50MB limit."
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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50",
          "cursor-pointer",
        )}
      >
        <Upload
          className={clsx(
            "mb-3 h-10 w-10",
            dragging ? "text-indigo-500" : "text-gray-400",
          )}
        />
        <p className="text-sm font-medium text-gray-700">
          Drop your files here or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supported: PDF, DOCX, TXT, EPUB — Max 50MB each — Up to{" "}
          {maxFiles} files
        </p>
      </div>

      {validateError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
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
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-700">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                className="ml-2 shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
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
