"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" },
];

export default function TopNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const initial = email.charAt(0).toUpperCase() || "R";

  return (
    <>
      {/* Mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--line)] bg-[var(--background)]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-display text-2xl italic leading-none text-indigo-600">
            R
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
            Readify
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-black/5"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-[var(--surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <span className="text-lg font-semibold text-[var(--ink)]">Menu</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSheetOpen(false)}
                  className={clsx(
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    pathname === link.href
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-[var(--foreground)] hover:bg-black/5",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-[var(--line)] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ddd6fe] text-sm font-semibold text-indigo-800">
                  {initial}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
                  {email}
                </span>
              </div>
              <Link
                href="/logout"
                className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Desktop */}
      <header className="sticky top-0 z-40 hidden border-b border-[var(--line)] bg-[var(--background)]/85 backdrop-blur-md md:block">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="font-display text-[1.65rem] italic leading-none text-indigo-600">
              R
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
              Readify
            </span>
          </Link>

          <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-2 transition hover:bg-black/[0.04]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ddd6fe] text-sm font-semibold text-indigo-800">
                {initial}
              </span>
              <span className="hidden max-w-[160px] truncate text-sm text-[var(--muted)] lg:inline">
                {email}
              </span>
              <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg">
                  <div className="border-b border-[var(--line)] px-4 py-3">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">
                      {email}
                    </p>
                    <p className="text-xs text-[var(--muted)]">Signed in</p>
                  </div>
                  <Link
                    href="/logout"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
