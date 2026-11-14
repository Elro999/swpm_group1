"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { ui } from "./ui";

/** Runs the story → competency matching for one interview (SB4) and refreshes the hub. */
export function MatchStoriesButton({ interviewId, label }: { interviewId: string; label: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/map`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "We couldn't match your stories. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={`${ui.btnSecondary} self-start`} onClick={run} disabled={!hydrated || busy}>
        {busy ? "Matching…" : label}
      </button>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
    </div>
  );
}
