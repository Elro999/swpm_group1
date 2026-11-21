"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ensureSession } from "@/lib/client";
import { useHydrated } from "@/lib/useHydrated";
import { ui } from "./ui";

/** Landing page actions (PF1, PF6): start with your own JD, or try the sample. No sign-up. */
export function StartButtons() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState<"own" | "sample" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(kind: "own" | "sample") {
    setBusy(kind);
    setError(null);
    if (!(await ensureSession())) {
      setError("We couldn't start your session. Please refresh and try again.");
      setBusy(null);
      return;
    }
    router.push(kind === "sample" ? "/interviews/new?sample=1" : "/interviews/new");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button type="button" className={ui.btnPrimary} onClick={() => go("own")} disabled={!hydrated || busy !== null}>
        {busy === "own" ? "Starting…" : "Start with my job description"}
      </button>
      <button type="button" className={ui.btnSecondary} onClick={() => go("sample")} disabled={!hydrated || busy !== null}>
        {busy === "sample" ? "Starting…" : "Try with a sample JD"}
      </button>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
    </div>
  );
}
