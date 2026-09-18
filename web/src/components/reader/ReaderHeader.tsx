"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  BookOpen,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import MenuAction from "@/components/library/MenuAction";

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
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight"
        >
          <BookOpen className="h-4 w-4 text-[#4F6EF6]" />
          Readify
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="hidden min-w-0 max-w-[40vw] truncate text-sm font-medium md:block">
            {title}
          </span>

          <span
            className={clsx(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              isPublic
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-600",
            )}
          >
            {isPublic ? "Public" : "Private"}
          </span>

          {isOwner && (
            <button
              type="button"
              onClick={onShare}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium transition hover:bg-black/5"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          )}

          {isOwner && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label="Document menu"
                aria-expanded={menuOpen}
                className="rounded-lg p-2 transition hover:bg-black/5"
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
                    className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-black/10 bg-[var(--background)] p-1.5 shadow-xl"
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
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#4F6EF6]"
                        />
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={onCancelRename}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-black/5"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={onCommitRename}
                            className="rounded-lg bg-[#4F6EF6] px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-110"
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
                        <div className="my-1 border-t border-black/10" />
                        <MenuAction
                          icon={<RefreshCw className="h-4 w-4" />}
                          label={reprocessing ? "Reprocessing…" : "Reprocess"}
                          onClick={onReprocess}
                        />
                        <MenuAction
                          icon={<Trash2 className="h-4 w-4 text-indigo-600" />}
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
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-black/10 bg-black/[0.03] px-4 py-2">
          <p className="text-xs font-medium sm:text-sm">
            Sign up to save your reading progress
          </p>
          <Link
            href="/signup"
            className="rounded-full bg-[#4F6EF6] px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[#4F6EF6] transition hover:bg-black/5"
          >
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}
