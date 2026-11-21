"use client";

import Link from "next/link";
import { ui } from "@/components/ui";

/**
 * Friendly error page for unexpected render errors (task 7.1). Shows no technical details; the digest
 * lets the team match the server log line without exposing anything to the user.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={`${ui.page} flex flex-col gap-4`}>
      <h1 className={ui.h1}>Something went wrong.</h1>
      <p className={ui.lead}>Your saved work is safe. Try again, or go back to the start.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={ui.btnPrimary} onClick={reset}>
          Try again
        </button>
        <Link href="/" className={ui.btnSecondary}>
          Go to the start
        </Link>
      </div>
      {error.digest && <p className={ui.muted}>Reference: {error.digest}</p>}
    </main>
  );
}
