"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import MenuAction from "@/components/library/MenuAction";
import Brand from "@/components/Brand";

/**
 * Reader chrome: brand, title, visibility badge, share button and the owner's
 * document menu. Also carries the "sign up to save progress" strip shown to
 * signed-out readers.
 */
export default function ReaderHeader({
  title,
  isOwner,
  isPublic,
  isSignedIn,
  homeHref,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  renaming,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onShare,
  onToggleVisibility,
  onReprocess,
  reprocessing,
  onDelete,
}: {
  title: string;
  isOwner: boolean;
  isPublic: boolean;
  isSignedIn: boolean;
  /** Where the brand links: the library when signed in, the landing page otherwise. */
  homeHref: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  renaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onShare: () => void;
  onToggleVisibility: () => void;
  onReprocess: () => void;
  reprocessing: boolean;
  onDelete: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link
          href={homeHref}
          className="flex shrink-0 items-center"
          aria-label="ReadIO home"
        >
          <Brand size="sm" />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <span className="hidden min-w-0 max-w-[36vw] truncate text-sm font-medium text-muted md:block">
            {title}
          </span>

          <span
            className={clsx(
              "hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] sm:inline-block",
              isPublic
                ? "bg-accent-soft text-accent"
                : "bg-surface-soft text-muted",
            )}
          >
            {isPublic ? "Public" : "Private"}
          </span>

          {isOwner && (
            <button
              type="button"
              onClick={onShare}
              className="btn btn-outline btn-sm !px-3 !py-1.5 text-xs"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {isOwner && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label="Document menu"
                aria-expanded={menuOpen}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-soft hover:text-ink"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={onCloseMenu}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    className="popover-in absolute right-0 z-20 mt-1.5 w-56 rounded-2xl border border-line bg-bg-elevated p-1.5 shadow-[var(--shadow-card)]"
                  >
                    {renaming ? (
                      <div className="p-1">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => onRenameValueChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onCommitRename();
                            if (e.key === "Escape") onCancelRename();
                          }}
                          onFocus={(e) => e.currentTarget.select()}
                          autoFocus
                          aria-label="Document title"
                          className="input !py-1.5 text-sm"
                        />
                        <div className="mt-2 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={onCancelRename}
                            className="btn btn-ghost btn-sm text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={onCommitRename}
                            className="btn btn-primary btn-sm text-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <MenuAction
                          icon={<Pencil className="h-4 w-4" />}
                          label="Rename"
                          onClick={onStartRename}
                        />
                        <MenuAction
                          icon={
                            isPublic ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Globe className="h-4 w-4" />
                            )
                          }
                          label={isPublic ? "Make private" : "Make public"}
                          onClick={onToggleVisibility}
                        />
                        <div className="my-1 border-t border-line" />
                        <MenuAction
                          icon={<RefreshCw className="h-4 w-4" />}
                          label={reprocessing ? "Reprocessing…" : "Reprocess"}
                          onClick={onReprocess}
                        />
                        <MenuAction
                          icon={<Trash2 className="h-4 w-4" />}
                          label="Delete"
                          danger
                          onClick={onDelete}
                        />
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!isSignedIn && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-line bg-surface/60 px-4 py-2">
          <p className="text-xs font-medium text-muted sm:text-sm">
            Sign up to save your reading progress
          </p>
          <Link href="/signup" className="btn btn-primary !px-3 !py-1 text-xs">
            Sign up
          </Link>
          <Link href="/login" className="btn btn-outline !px-3 !py-1 text-xs">
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}
