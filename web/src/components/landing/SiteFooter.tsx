import Link from "next/link";
import Brand from "@/components/Brand";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Live demo", href: "/demo" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Formats",
    links: [
      { label: "PDF", href: "/signup" },
      { label: "DOCX", href: "/signup" },
      { label: "YouTube", href: "/signup" },
      { label: "Markdown & text", href: "/signup" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg-elevated/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The speed reader that moves the text, not your eyes. Read PDFs,
              docs and transcripts at the speed of thought.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-subtle">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-muted transition hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Oversized wordmark — the cerebrium footer flourish. */}
        <div
          className="mt-14 select-none text-center font-extrabold leading-none tracking-tight"
          aria-hidden="true"
          style={{
            fontSize: "clamp(3.5rem, 14vw, 11rem)",
            color: "transparent",
            WebkitTextStroke: "1px var(--color-line-strong)",
          }}
        >
          READ/IO
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} Readio. All rights reserved.</p>
          <p className="font-medium">
            Built for readers who refuse to skim.
          </p>
        </div>
      </div>
    </footer>
  );
}
