"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Library,
  LogOut,
  Settings,
  Share2,
  Upload,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "readify.sidebar.collapsed";

/**
 * Collapsible left rail — full labels or icons-only.
 * Matches concept mockups (sidebar app shell + compact icon mode).
 */
export default function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = email.charAt(0).toUpperCase() || "R";
  const name = email.split("@")[0] || "You";
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg-elevated transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[72px] px-2 py-4" : "w-[232px] px-3 py-5",
          !ready && "opacity-0",
        )}
      >
        {/* Brand + collapse */}
        <div
          className={clsx(
            "mb-5 flex items-center",
            collapsed ? "flex-col gap-3" : "justify-between gap-2 px-1",
          )}
        >
          <Link
            href="/dashboard"
            className={clsx(
              "flex items-center gap-2",
              collapsed && "justify-center",
            )}
            title="Readify"
          >
            <span className="font-display text-2xl italic leading-none text-orp">
              R
            </span>
            {!collapsed && (
              <span className="text-[15px] font-semibold tracking-tight">
                Readify
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-[#efeae1] hover:text-ink"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* + New */}
        <Link
          href="/upload"
          title="New"
          className={clsx(
            "mb-4 flex items-center justify-center gap-1.5 rounded-full bg-paper text-sm font-semibold text-ink-inv transition hover:opacity-90",
            collapsed ? "mx-auto h-10 w-10" : "px-3 py-2.5",
          )}
        >
          {collapsed ? "+" : "+ New"}
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={clsx(
                  "flex items-center rounded-[12px] text-sm font-medium transition",
                  collapsed
                    ? "mx-auto h-10 w-10 justify-center"
                    : "gap-2.5 px-3 py-2.5",
                  active
                    ? "bg-[#efeae1] text-ink"
                    : "text-muted hover:bg-[#efeae1]/60 hover:text-ink",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div
          className={clsx(
            "mt-auto",
            collapsed
              ? "flex flex-col items-center gap-2"
              : "flex items-center gap-2.5 rounded-[16px] px-2 py-2",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c9b8f2] text-sm font-semibold text-[#2d2150]">
            {initial}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium capitalize">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          )}
        </div>
        <Link
          href="/logout"
          title="Sign out"
          className={clsx(
            "mt-1 flex items-center rounded-[12px] text-xs font-medium text-muted hover:text-ink",
            collapsed
              ? "mx-auto h-9 w-9 justify-center"
              : "gap-2 px-3 py-2",
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && "Sign out"}
        </Link>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-display text-xl italic text-orp">R</span>
            <span className="text-sm font-semibold">Readify</span>
          </Link>
          <Link
            href="/upload"
            className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink-inv"
          >
            + New
          </Link>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg-elevated md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
