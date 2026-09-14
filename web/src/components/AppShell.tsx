"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Home,
  Library,
  LogOut,
  Settings,
  Share2,
  Upload,
  BarChart2,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Cream editorial shell with left sidebar — recovered from original preview AppShell. */
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

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-bg-elevated px-3 py-5 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="font-display text-2xl italic leading-none text-orp">
            R
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Readify</span>
        </Link>

        <Link
          href="/upload"
          className="mb-4 flex items-center justify-center gap-1.5 rounded-full bg-paper px-3 py-2.5 text-sm font-semibold text-ink-inv transition hover:opacity-90"
        >
          + New
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-[#efeae1] text-ink"
                    : "text-muted hover:bg-[#efeae1]/60 hover:text-ink",
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 rounded-[16px] px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9b8f2] text-sm font-semibold text-[#2d2150]">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium capitalize">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
        </div>
        <Link
          href="/logout"
          className="mt-1 flex items-center gap-2 rounded-[12px] px-3 py-2 text-xs font-medium text-muted hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Link>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
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

        {/* Mobile bottom nav */}
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
