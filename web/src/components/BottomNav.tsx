"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  Home,
  PlusCircle,
  User,
} from "lucide-react";

const TABS = [
  { href: "/library", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/upload", label: "Upload", icon: PlusCircle, center: true },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;

          if (tab.center) {
            return (
              <Link
                key={tab.label}
                href={tab.href}
                aria-label={tab.label}
                className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 pb-1.5 pt-2"
              >
                <span className="flex h-12 w-12 -translate-y-2.5 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-medium text-[var(--muted)]">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-label={tab.label}
              className={clsx(
                "flex min-h-[56px] flex-col items-center justify-center gap-0.5 pb-1.5 pt-2",
                active ? "font-semibold text-indigo-600" : "text-[var(--muted)]"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}