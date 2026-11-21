"use client";

import Link from "next/link";
import { useState } from "react";
import { Recorder } from "@/components/Recorder";
import { ui } from "@/components/ui";
import { useHydrated } from "@/lib/useHydrated";
import type { AttemptView } from "@/modules/attempt/view";
import { FeedbackView } from "./FeedbackView";

/**
 * Client flow for one question: start → record answer → follow-up (record or skip) → feedback → try again.
 * Every step is one request; the server owns the state machine (modules/attempt/service.ts).
 */
export function MockSession({ questionId, initial }: { questionId: string; initial: AttemptView | null }) {
  const hydrated = useHydrated();
  const [view, setView] = useState<AttemptView | null>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  // No button can be clicked before its handler exists (hydration) or while a request runs.
  const locked = !hydrated || busy !== null;
  const [error, setError] = useState<string | null>(null);

  async function call(label: string, request: () => Promise<Response>) {
    setBusy(label);
    setError(null);
    try {
      const res = await request();
      const data = await res.json().catch(() => ({}));
      if (res.ok) setView(data as AttemptView);
      else setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const start = () =>
    call("Getting ready…", () =>
      fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId }) }),
    );
  const upload = (part: "answer" | "followup", label: string) => (blob: Blob) =>
    call(label, () => fetch(`/api/attempts/${view!.id}/${part}`, { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, body: blob }));
  const act = (action: "skip-followup" | "resume", label: string) => () =>
    call(label, () => fetch(`/api/attempts/${view!.id}/${action}`, { method: "POST" }));

  const v = view;
  const needsAnswer = v && (v.status === "created" || (v.status === "failed" && !v.answer && !v.hasAnswerAudio));
  const canResume = v && v.status === "failed" && !needsAnswer;
  const working = v && ["uploaded", "transcribing", "transcribed", "followup_uploaded", "followup_transcribed", "analysing"].includes(v.status);

  return (
    <div className="flex flex-col gap-6">
      {busy && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
          <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {busy}
        </p>
      )}
      {(error || v?.error) && (
        <p role="alert" className={ui.error}>
          {error ?? v?.error}
        </p>
      )}

      {!v && (
        <section className={ui.card}>
          <p className="mb-3">When you are ready, press start and answer the question out loud.</p>
          <button type="button" className={ui.btnPrimary} onClick={start} disabled={locked}>
            Start practising
          </button>
        </section>
      )}

      {v && v.attemptNo > 1 && v.status !== "ready" && <p className={ui.muted}>Attempt {v.attemptNo}</p>}

      {needsAnswer && (
        <section aria-labelledby="answer-title" className={ui.card}>
          <h2 id="answer-title" className={ui.h2}>
            Your answer
          </h2>
          <div className="mt-3">
            <Recorder onSubmit={upload("answer", "Transcribing your answer…")} disabled={locked} />
          </div>
        </section>
      )}

      {v?.status === "followup_ready" && v.followup && (
        <section aria-labelledby="followup-title" className={`${ui.card} border-indigo-300 dark:border-indigo-800`}>
          <h2 id="followup-title" className={ui.h2}>
            Follow-up
          </h2>
          <p className={`mt-1 ${ui.muted}`}>
            You said: <q>{v.followup.quote}</q>
          </p>
          <p className="mt-2 text-lg font-medium" data-testid="followup-question">
            {v.followup.question}
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <Recorder
              onSubmit={upload("followup", "Listening to your follow-up and preparing feedback…")}
              disabled={locked}
              startLabel="Answer the follow-up"
              submitLabel="Send and get feedback"
            />
            <button type="button" className={`${ui.btnSecondary} self-start`} onClick={act("skip-followup", "Preparing your feedback…")} disabled={locked}>
              Skip the follow-up and get feedback
            </button>
          </div>
        </section>
      )}

      {(canResume || working) && (
        <section className={ui.card}>
          <p className="mb-3">{working ? "This attempt is still being processed." : "Your recording is saved."}</p>
          <button type="button" className={ui.btnPrimary} onClick={act("resume", "Trying again…")} disabled={locked}>
            Try again
          </button>
        </section>
      )}

      {v?.status === "ready" && v.feedback && (
        <>
          <FeedbackView view={v} />
          <section className={`${ui.card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <p>Pick one point above, fix it, and answer again.</p>
            <div className="flex flex-wrap gap-3">
              {v.attemptNo > 1 && (
                <Link href={`/i/${v.question.interviewId}/mock/${questionId}/compare`} className={ui.btnSecondary}>
                  Compare with attempt {v.attemptNo - 1}
                </Link>
              )}
              <button type="button" className={ui.btnPrimary} onClick={start} disabled={locked}>
                Try this question again
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
