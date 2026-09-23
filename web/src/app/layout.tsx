import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import "./globals.css";

/*
 * Self-hosted variable fonts (Fontsource packages). next/font/google would
 * hit fonts.googleapis.com at build time — an external dependency, a privacy
 * leak and a build failure whenever the network is restricted. The woff2s
 * are small (the display face is the only one preloaded) and versioned with
 * the app.
 *
 *  Fraunces  — display. Variable: opsz 9–144, wght 100–900, SOFT, WONK.
 *             Headlines and italic "turn" words; the weight axis drives the
 *             footer wordmark sweep.
 *  Mona Sans — body + reader. Variable: wght 200–900, wdth 75–125.
 *             Large x-height; legible at 800 WPM. The Line Flow layout engine
 *             measures from the resolved font, so it stays accurate.
 *  Geist Mono — utility. Variable: wght 100–900. Chapter labels, WPM metrics,
 *             keyboard hints.
 */

const fraunces = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const mona = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-standard-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
  ],
  variable: "--font-mona",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const geistMono = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

// Noto Sans Devanagari / Noto Sans Gujarati are declared as plain @font-face
// rules in globals.css (no preload): they are only fetched on pages that
// actually render Devanagari or Gujarati text (the reader).

export const metadata: Metadata = {
  applicationName: "Read/IO",
  title: {
    default: "Read/IO — Read at the speed of thought",
    template: "%s — Read/IO",
  },
  description:
    "Readio turns PDFs, documents and YouTube transcripts into a focused speed-reading stream. Line Flow keeps your eyes perfectly still while the text moves.",
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Motion gate. Added before first paint when the user hasn't asked for
 * reduced motion, so reveal/mask start states never flash for signed-out
 * visitors. With JS off (or reduced motion on) content is fully visible.
 */
const motionGate = `(function(){try{if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;document.documentElement.classList.add("motion");}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The pre-paint motion gate (and the signed-in theme script) add
      // classes to <html> before hydration, the same pattern next-themes
      // uses — React must not flag those attributes as mismatches.
      suppressHydrationWarning
      className={`${fraunces.variable} ${mona.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionGate }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-bg-elevated)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-line)",
              borderRadius: "999px",
              fontSize: "14px",
              boxShadow: "var(--shadow-card)",
            },
          }}
        />
      </body>
    </html>
  );
}
