"use client";

import Link from "next/link";
import Brand from "@/components/Brand";
import Reveal from "@/components/landing/Reveal";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#how", label: "How it works" },
      { href: "#faq", label: "FAQ" },
      { href: "/demo", label: "Live demo" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Log in" },
      { href: "/reader", label: "Reader" },
      { href: "/library", label: "Your library" },
    ],
  },
  {
    title: "Elsewhere",
    links: [
      {
        href: "https://github.com/omsenjalia/readio",
        label: "GitHub",
      },
      {
        href: "https://github.com/omsenjalia/readio/blob/main/README.md",
        label: "Docs & README",
      },
    ],
  },
];

/**
 * Footer finale: the giant Fraunces wordmark with a variable-weight sweep,
 * a quiet link grid, and a mono colophon line.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-soft/40">
      <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-20">
        {/* Giant wordmark — weight sweeps in when it enters the viewport */}
        <Reveal as="div" className="overflow-hidden">
          <a
            href="/"
            aria-label="Read/IO home"
            className="wordmark-sweep block select-none text-[clamp(4.5rem,17vw,15rem)] leading-[0.9] tracking-[-0.04em] text-ink"
          >
            Read<span className="text-accent">/</span>IO
          </a>
        </Reveal>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Brand size="sm" />
            <p className="mt-4 max-w-56 text-sm leading-relaxed text-muted">
              Silent reading at the speed of thought. Drop in anything, set
              your pace, and let the page walk.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mono text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
            © 2026 Readio
          </p>
          <p className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
            Built for eyes that move too fast
          </p>
        </div>
      </div>
    </footer>
  );
}
