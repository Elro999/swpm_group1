"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { postJson } from "@/lib/client";
import { useHydrated } from "@/lib/useHydrated";
import { ui } from "./ui";

/**
 * Consent gate (PF2). Anything that records the user's voice MUST be rendered inside this component:
 * until the user agrees, the children are not rendered at all, so recording is impossible.
 * The server also stores consent_at; the recorder API (Phase 2) must check it too.
 */
export function ConsentGate({ consented, children }: { consented: boolean; children: ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [agreed, setAgreed] = useState(consented);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (agreed) return <>{children}</>;

  async function agree() {
    setBusy(true);
    setError(null);
    const r = await postJson("/api/session/consent");
    setBusy(false);
    if (!r.ok) {
      setError(r.data.error ?? "We couldn't save your choice. Please try again.");
      return;
    }
    setAgreed(true);
    router.refresh();
  }

  return (
    <section aria-labelledby="consent-title" className={`${ui.card} border-amber-300 dark:border-amber-800`}>
      <h3 id="consent-title" className={ui.h2}>
        Before you record
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>Your spoken answers are recorded and turned into text so we can point to the exact moment to fix.</li>
        <li>The audio and text are processed by our AI providers (speech-to-text and language model) only to give you feedback.</li>
        <li>A member of our small student team may read your transcripts and feedback to check that the feedback is accurate.</li>
        <li>Audio is deleted after 30 days. You can delete everything at any time.</li>
      </ul>
      <p className="mt-2 text-sm">
        Details: <Link href="/privacy" className={ui.link}>how we handle your data</Link>.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" className={ui.btnPrimary} onClick={agree} disabled={!hydrated || busy}>
          {busy ? "Saving…" : "I agree, let me practise"}
        </button>
      </div>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
    </section>
  );
}
