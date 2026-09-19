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
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:py-2",
        danger
          ? "text-danger hover:bg-danger-soft"
          : "text-ink hover:bg-surface-soft",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
