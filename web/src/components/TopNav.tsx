"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BookOpen, ChevronDown, LogOut, Menu, X } from "lucide-react";

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
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <Link href="/library" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white">
            R
          </span>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Readify
          </span>
        </Link>
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <span className="text-lg font-bold tracking-tight text-gray-900">
                Menu
              </span>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
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
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    pathname === link.href
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
                  {initial}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-gray-700">
                  {email}
                </span>
              </div>
              <Link
                href="/logout"
                className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Desktop top bar */}
      <header className="sticky top-0 z-40 hidden border-b border-gray-200 bg-white/90 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
          <Link
            href="/library"
            className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-gray-900"
          >
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Readify
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-3 py-2 text-sm font-medium text-gray-600 transition hover:text-gray-900",
                  pathname === link.href &&
                    "border-b-2 border-indigo-600 text-gray-900"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="relative ml-auto">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full px-2 py-1.5 transition hover:bg-gray-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
                {initial}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-gray-100 px-4 pb-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {email}
                    </p>
                    <p className="text-xs text-gray-500">Signed in</p>
                  </div>
                  <Link
                    href="/logout"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
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