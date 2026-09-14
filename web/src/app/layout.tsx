import type { Metadata } from "next";
import { Newsreader, Source_Sans_3, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoDeva = Noto_Sans_Devanagari({
  variable: "--font-noto-deva",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
});

const notoGuj = Noto_Sans_Gujarati({
  variable: "--font-noto-guj",
  subsets: ["gujarati"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Readify",
  description: "RSVP speed reader with optimal recognition point highlighting",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${sourceSans.variable} ${notoDeva.variable} ${notoGuj.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
