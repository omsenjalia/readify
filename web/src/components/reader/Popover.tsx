"use client";

import { useEffect, type ReactNode } from "react";
import clsx from "clsx";

/**
 * A click-to-open popover anchored above its trigger.
 *
 * One shared implementation for the speed, font-size and settings panels:
 * closes on outside click *and* Escape, and stops the Escape from also
 * toggling playback. The trigger is supplied fully wired by the caller,
 * which keeps the owning component in charge of which panel is open (only
 * one at a time).
 */
export default function Popover({
  open,
  onClose,
  label,
  trigger,
  children,
  align = "center",
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the panel. */
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: "center" | "right";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Stop the reader's global shortcut handler from also acting on this.
      e.stopPropagation();
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  return (
    <div className="relative">
      {trigger}

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label={label}
            className={clsx(
              "popover-in absolute bottom-11 z-20 rounded-2xl border border-line bg-bg-elevated p-4",
              "shadow-[var(--shadow-card)]",
              align === "center" && "left-1/2 -translate-x-1/2",
              align === "right" && "right-0",
              className,
            )}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
