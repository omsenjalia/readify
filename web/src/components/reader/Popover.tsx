"use client";

import { useEffect, type ReactNode } from "react";
import clsx from "clsx";

/**
 * A click-to-open popover anchored above its trigger.
 *
 * `Reader.tsx` had four hand-rolled copies of this pattern (speed, font size,
 * settings and the document menu), each with its own `fixed inset-0` scrim and
 * none of them closing on Escape. This one closes on outside click *and*
 * Escape, and stops the Escape from also toggling playback.
 *
 * The trigger is supplied fully wired by the caller, which keeps the owning
 * component in charge of which panel is open (only one at a time).
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
              "absolute bottom-10 z-20 rounded-xl border border-gray-200 bg-white p-4 shadow-xl",
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
