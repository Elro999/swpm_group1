"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { refreshStreak } from "@/components/streak/useStreak";
import { StreakToast } from "@/components/streak/StreakToast";
import { StarProgress } from "@/components/StarProgress";
import { ui } from "@/components/ui";
import type { AttemptView } from "@/modules/attempt/view";
import { formatMs } from "@/modules/feedback/transcript";
import { STAR_LABEL } from "@/modules/stories/star";
import { StoryNotice } from "./StoryNotice";

/**
 * Feedback screen (task 2.7; MF4, MF5, MF7). Every point shows the user's own words and the moment
 * they said them; clicking the time plays the recording from there. Nothing here suggests new wording.
 * 2026-11-27: STAR is one of the checks, not a separate screen: a fourth tile next to decision, I/we and length
 * (common region, same tile shape), STAR points in the same list, and each transcript sentence tagged with its
 * part so the flow S → T → A → R is visible. The answer is saved to My stories (StoryNotice).
 */
type Point = NonNullable<AttemptView["feedback"]>["points"][number];

const SEVERITY: Record<Point["severity"], { label: string; cls: string }> = {
  fix: { label: "Fix this", cls: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" },
  warn: { label: "Worth a look", cls: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  info: { label: "Working well", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
};

const TARGET_MS = 120_000;

export function FeedbackView({ view: initialView }: { view: AttemptView }) {
  const [view, setView] = useState(initialView);
  const fb = view.feedback!;
  const answer = view.answer!;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [notUseful, setNotUseful] = useState<Record<string, boolean>>(() => Object.fromEntries(fb.points.map((p) => [p.id, p.notUseful])));
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});

  // Record the view server-side (first_feedback_viewed etc.); the server de-duplicates.
  useEffect(() => {
    void fetch(`/api/attempts/${view.id}/viewed`, { method: "POST" })
      .then(() => refreshStreak())
      .catch(() => undefined);
  }, [view.id]);

  // Load the user's own recording as a blob so seeking works without range requests.
  useEffect(() => {
    if (!view.hasAnswerAudio) return;
    let url: string | null = null;
    let cancelled = false;
    fetch(`/api/attempts/${view.id}/audio?part=answer`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b && !cancelled) {
          url = URL.createObjectURL(b);
          setAudioUrl(url);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [view.id, view.hasAnswerAudio]);

  function playFrom(ms: number) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = ms / 1000;
    void a.play().catch(() => undefined);
  }

  async function rate(p: Point, value: boolean, reason?: string) {
    setNotUseful((s) => ({ ...s, [p.id]: value }));
    await fetch(`/api/points/${p.id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notUseful: value, reason: reason ?? null }),
    }).catch(() => undefined);
    if (reason) setSent((s) => ({ ...s, [p.id]: true }));
  }

  // Which words are covered by a point (for highlighting in the transcript).
  const highlighted = useMemo(() => {
    const set = new Map<number, Point["severity"]>();
    const rank = { fix: 3, warn: 2, info: 1 } as const;
    answer.words.forEach((w, i) => {
      for (const pt of fb.points) {
        if (w.start < pt.startMs || w.end > pt.endMs) continue;
        const cur = set.get(i);
        if (!cur || rank[pt.severity] > rank[cur]) set.set(i, pt.severity);
      }
    });
    return set;
  }, [answer.words, fb.points]);

  const m = fb.metrics;
  const tile = (label: string, value: string, note: string, anchor?: string) => (
    <div className={ui.card}>
      <p className={ui.muted}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-1 ${ui.muted}`}>
        {anchor ? (
          <a href={`#${anchor}`} className={ui.link}>
            {note}
          </a>
        ) : (
          note
        )}
      </p>
    </div>
  );
  const has = (id: string) => fb.points.some((p) => p.checkId === id);
  const star = view.star;
  const firstMissing = star?.missing[0];
  const starTile = star && (
    <div className={ui.card} data-testid="star-tile">
      <p className={ui.muted}>STAR</p>
      <StarProgress missing={star.missing} size="md" className="mt-1.5" />
      <p className={`mt-2 ${ui.muted}`}>
        {firstMissing ? (
          <a href={`#point-star_missing_${firstMissing}`} className={ui.link}>
            No {star.missing.map((p) => STAR_LABEL[p]).join(" or ")}: see where
          </a>
        ) : star.outOfOrderAt !== null ? (
          <a href="#point-star_order" className={ui.link}>
            Out of order: see where
          </a>
        ) : (
          "All four, in order"
        )}
      </p>
    </div>
  );

  return (
    <section aria-labelledby="feedback-title" className="flex flex-col gap-6" data-testid="feedback">
      <StreakToast />
      <h2 id="feedback-title" className="text-2xl font-semibold tracking-tight">
        Feedback{view.attemptNo > 1 ? ` · attempt ${view.attemptNo}` : ""}
      </h2>

      <div className={`grid gap-3 ${star ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-3"}`} data-testid="metrics">
        {starTile}
        {tile(
          "Time to your decision",
          m.timeToDecisionMs === null ? "Not found" : formatMs(m.timeToDecisionMs),
          m.timeToDecisionMs === null ? "See where to start" : has("late_decision") ? "Arrives late: see where" : "Early enough",
          has("late_decision") ? "point-late_decision" : has("no_decision") ? "point-no_decision" : undefined,
        )}
        {tile("“I” vs “we”", `${m.iCount} / ${m.weCount}`, has("we_not_i") ? "More “we” than “I”: see where" : "Your role comes through", has("we_not_i") ? "point-we_not_i" : undefined)}
        {tile("Length", formatMs(m.durationMs), m.durationMs > TARGET_MS ? `Over the ~${formatMs(TARGET_MS)} target` : `Within ~${formatMs(TARGET_MS)}`, has("too_long") ? "point-too_long" : undefined)}
      </div>

      <StoryNotice view={view} onChange={setView} />

      <ul className="flex flex-wrap gap-2 text-sm">
        <li className={ui.chip}>Answered the question: {m.answeredQuestion === null ? "unclear" : m.answeredQuestion ? "yes" : "not quite"}</li>
        <li className={ui.chip}>Showed the competency: {m.competencyShown === null ? "unclear" : m.competencyShown ? "yes" : "not yet"}</li>
      </ul>

      {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full" aria-label="Your answer" />}

      <div className="flex flex-col gap-3">
        <h3 className={ui.h2}>What to look at ({fb.points.length})</h3>
        {fb.points.length === 0 && <p className={ui.muted}>Nothing stood out. Try the next question.</p>}
        <ol className="flex flex-col gap-3" data-testid="points">
          {fb.points.map((p) => (
            <li key={p.id} id={`point-${p.checkId}`} className={`${ui.card} ${notUseful[p.id] ? "opacity-60" : ""}`} data-testid="point">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY[p.severity].cls}`}>{SEVERITY[p.severity].label}</span>
                {p.checkId.startsWith("star_") && <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">STAR</span>}
                <button type="button" className={ui.link} onClick={() => playFrom(p.startMs)} disabled={!audioUrl} aria-label={`Play from ${formatMs(p.startMs)}`}>
                  ▶ {formatMs(p.startMs)}
                </button>
              </div>
              <blockquote className={`mt-2 ${ui.quote}`} data-testid="point-quote">
                “{p.quote}”
              </blockquote>
              <p className="mt-2">{p.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {!notUseful[p.id] ? (
                  <button type="button" className={ui.link} onClick={() => rate(p, true)}>
                    Not useful?
                  </button>
                ) : (
                  <>
                    <span>Marked not useful.</span>
                    <button type="button" className={ui.link} onClick={() => rate(p, false)}>
                      Undo
                    </button>
                    {!sent[p.id] && (
                      <span className="flex items-center gap-2">
                        <label htmlFor={`reason-${p.id}`} className="sr-only">
                          Why was this not useful? (optional)
                        </label>
                        <input
                          id={`reason-${p.id}`}
                          className={`${ui.input} mt-0 w-56 py-1 text-sm`}
                          placeholder="Why? (optional)"
                          value={reasons[p.id] ?? ""}
                          onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                          maxLength={500}
                        />
                        <button type="button" className={ui.link} onClick={() => rate(p, true, reasons[p.id])} disabled={!reasons[p.id]?.trim()}>
                          Send
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <details className={ui.card} open>
        <summary className="cursor-pointer font-medium">Your answer, word for word</summary>
        {star && <p className={`mt-2 ${ui.muted}`}>Each sentence is tagged with the STAR part it tells, so you can see the order the listener heard.</p>}
        <ol className="mt-3 flex flex-col gap-1.5" data-testid="transcript">
          {answer.sentences.map((s, si) => (
            <li key={si} className="flex gap-3 leading-8" data-testid="transcript-sentence" data-part={s.part ?? undefined}>
              {s.part && (
                <span
                  className={`mt-1.5 inline-flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold ${
                    star?.outOfOrderAt === si ? "border border-amber-500 text-amber-800 dark:text-amber-300" : "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                  }`}
                  title={STAR_LABEL[s.part]}
                >
                  <span aria-hidden="true">{STAR_LABEL[s.part][0]}</span>
                  <span className="sr-only">{STAR_LABEL[s.part]}:</span>
                </span>
              )}
              <span>
                {answer.words.slice(s.firstWord, s.lastWord + 1).map((w, k) => {
                  const i = s.firstWord + k;
                  const sev = highlighted.get(i);
                  const cls =
                    sev === "fix" ? "bg-red-100 dark:bg-red-900/50" : sev === "warn" ? "bg-amber-100 dark:bg-amber-900/50" : sev === "info" ? "bg-emerald-100 dark:bg-emerald-900/50" : "";
                  return (
                    <span key={i}>
                      <span className={`${cls} cursor-pointer rounded-sm`} onClick={() => playFrom(w.start)}>
                        {w.w}
                      </span>{" "}
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ol>
      </details>

      {view.followup && (
        <details className={ui.card}>
          <summary className="cursor-pointer font-medium">Follow-up: {view.followup.question}</summary>
          <p className="mt-3">{view.followup.skipped ? "You skipped the follow-up." : view.followup.transcript}</p>
        </details>
      )}
    </section>
  );
}
