"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

/** A single row inside a dropdown menu (library table row actions). */
export default function MenuAction({
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
        "flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
