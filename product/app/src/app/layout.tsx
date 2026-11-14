import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Interview Prep Companion",
  description: "Practise fit and behavioural answers and see the exact moment an answer lost the listener.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav aria-label="Main" className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Interview Prep Companion
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/stories" className="text-zinc-700 hover:underline dark:text-zinc-300">
                My stories
              </Link>
              <Link href="/privacy" className="text-zinc-600 hover:underline dark:text-zinc-400">
                Privacy
              </Link>
            </div>
          </nav>
        </header>
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
