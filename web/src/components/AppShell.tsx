"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import Brand from "@/components/Brand";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "readio.sidebar.collapsed";
const LEGACY_STORAGE_KEY = "readify.sidebar.collapsed";
/** Notifies same-tab listeners, since `storage` only fires in other tabs. */
const TOGGLE_EVENT = "readio:sidebar-toggle";

/**
 * Sidebar collapse state lives in localStorage (an external system), so it is
 * read with `useSyncExternalStore` rather than copied into state inside an
 * effect — no cascading render on mount, no hydration flash.
 */
function subscribeToSidebar(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(TOGGLE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TOGGLE_EVENT, onChange);
  };
}

function readCollapsed(): boolean {
  try {
    const value =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

/** Server/initial render always shows the expanded sidebar. */
function serverCollapsed(): boolean {
  return false;
}

function writeCollapsed(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Private mode / storage disabled: fall back to in-memory only.
  }
  window.dispatchEvent(new Event(TOGGLE_EVENT));
}

/**
 * App chrome: collapsible desktop rail + mobile top bar with a thumb-friendly
 * bottom nav (upload gets the centre spot).
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
  const collapsed = useSyncExternalStore(
    subscribeToSidebar,
    readCollapsed,
    serverCollapsed,
  );

  const toggle = useCallback(() => {
    writeCollapsed(!readCollapsed());
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside
        className={clsx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg-elevated transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[76px] px-2.5 py-5" : "w-[240px] px-3.5 py-5",
        )}
      >
        {/* Brand + collapse */}
        <div
          className={clsx(
            "mb-6 flex items-center",
            collapsed ? "flex-col gap-3" : "justify-between gap-2 px-1",
          )}
        >
          <Link
            href="/dashboard"
            className={clsx("flex items-center", collapsed && "justify-center")}
            title="ReadIO"
          >
            <Brand size="sm" withWordmark={!collapsed} />
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition hover:bg-surface-soft hover:text-ink"
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
          title="New upload"
          className={clsx(
            "btn btn-primary mb-5 shadow-none",
            collapsed ? "mx-auto h-10 w-10 !p-0" : "btn-md w-full",
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {!collapsed && "New upload"}
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={clsx(
                  "relative flex items-center rounded-xl text-sm font-medium transition",
                  collapsed
                    ? "mx-auto h-10 w-10 justify-center"
                    : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-accent-soft text-ink"
                    : "text-muted hover:bg-surface-soft hover:text-ink",
                )}
              >
                {active && (
                  <span
                    className={clsx(
                      "absolute rounded-full bg-accent",
                      collapsed
                        ? "-left-2.5 top-1/2 h-5 w-1 -translate-y-1/2"
                        : "-left-3.5 top-1/2 h-5 w-1 -translate-y-1/2",
                    )}
                    aria-hidden="true"
                  />
                )}
                <item.icon
                  className={clsx(
                    "h-4.5 w-4.5 shrink-0",
                    active ? "text-accent" : "",
                  )}
                  strokeWidth={1.75}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div
          className={clsx(
            "mt-auto rounded-2xl",
            collapsed
              ? "flex flex-col items-center gap-2"
              : "bg-surface/60 p-3",
          )}
        >
          <div className={clsx("flex items-center gap-2.5", collapsed && "flex-col")}>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent-text)",
                border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
              }}
            >
              {initial}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize text-ink">
                  {name}
                </p>
                <p className="truncate text-xs text-subtle">{email}</p>
              </div>
            )}
          </div>
          <Link
            href="/logout"
            title="Sign out"
            className={clsx(
              "flex items-center text-xs font-semibold text-muted transition hover:text-ink",
              collapsed
                ? "mx-auto mt-1 h-8 w-8 justify-center rounded-lg hover:bg-surface-soft"
                : "mt-2.5 gap-2 px-1 py-1.5",
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && "Sign out"}
          </Link>
        </div>
      </aside>

      {/* ---------------- Main column ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl md:hidden"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}
        >
          <Link href="/dashboard" aria-label="ReadIO home">
            <Brand size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              aria-label="Account settings"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent-text)",
              }}
            >
              {initial}
            </Link>
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>

        {/* Mobile bottom nav — upload takes the thumb-friendly centre. */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-elevated/95 backdrop-blur-xl md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          aria-label="Primary"
        >
          <div className="grid grid-cols-5 items-end px-2 pb-1.5 pt-1.5">
            <BottomLink
              href="/dashboard"
              label="Home"
              icon={LayoutGrid}
              active={isActive("/dashboard")}
            />
            <BottomLink
              href="/library"
              label="Library"
              icon={FolderOpen}
              active={isActive("/library")}
            />

            {/* Centre: upload */}
            <div className="flex justify-center">
              <Link
                href="/upload"
                aria-label="New upload"
                className="-mt-5 flex h-13 w-13 items-center justify-center rounded-full bg-accent text-on-accent transition active:scale-95"
                style={{
                  boxShadow:
                    "0 8px 24px color-mix(in srgb, var(--color-accent) 45%, transparent)",
                }}
              >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
              </Link>
            </div>

            <BottomLink
              href="/stats"
              label="Stats"
              icon={BarChart3}
              active={isActive("/stats")}
            />
            <BottomLink
              href="/settings"
              label="Settings"
              icon={Settings}
              active={isActive("/settings")}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

function BottomLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
        active ? "text-accent" : "text-subtle",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
      {label}
    </Link>
  );
}
