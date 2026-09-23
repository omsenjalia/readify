import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import "./globals.css";

/*
 * Self-hosted variable fonts (Fontsource packages). next/font/google would
 * hit fonts.googleapis.com at build time — an external dependency, a privacy
 * leak and a build failure whenever the network is restricted. The woff2s are
 * tiny (~50KB each) and versioned with the app.
 */

const inter = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});

const newsreader = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2",
      weight: "200 800",
      style: "italic",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const notoDeva = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-noto-deva",
  display: "swap",
});

const notoGuj = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-noto-guj",
  display: "swap",
});

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
  themeColor: "#f4f8f4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${notoDeva.variable} ${notoGuj.variable} h-full antialiased`}
    >
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
