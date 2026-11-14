"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { ui } from "./ui";

/**
 * "Delete my data" (PF2, task 6.3). Two steps (no browser dialog): ask, then confirm. Deletes recordings,
 * interviews, stories, attempts and feedback, and ends the session; the private link stops working.
 */
export function DeleteDataButton() {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setStage("busy");
    setError(null);
    const res = await fetch("/api/session", { method: "DELETE" }).catch(() => null);
    if (res?.ok || res?.status === 401) {
      setStage("done"); // 401: nothing to delete (no session); the outcome for the user is the same
      return;
    }
    const data = res ? await res.json().catch(() => ({})) : {};
    setError((data as { error?: string }).error ?? "Network problem. Nothing was removed; please try again.");
    setStage("confirm");
  }

  if (stage === "done") {
    return (
      <p role="status" className="font-medium" data-testid="data-deleted">
        Your data has been deleted: recordings, transcripts, interviews, stories and feedback. Your private link no longer works.{" "}
        <Link href="/" prefetch={false} className={ui.link}>
          Start again
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {stage === "idle" ? (
        <button type="button" className={`${ui.btnSecondary} self-start`} onClick={() => setStage("confirm")} disabled={!hydrated}>
          Delete my data
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-red-300 p-3 dark:border-red-800">
          <p>This permanently deletes your recordings, transcripts, interviews, stories and feedback. It cannot be undone.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={`${ui.btnPrimary} bg-red-700 hover:bg-red-800`} onClick={remove} disabled={stage === "busy"}>
              {stage === "busy" ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button type="button" className={ui.btnSecondary} onClick={() => setStage("idle")} disabled={stage === "busy"}>
              Keep my data
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
    </div>
  );
}
