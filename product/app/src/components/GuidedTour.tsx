"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ui } from "@/components/ui";

/**
 * First-visit walkthrough of the role page (2026-11-27). The page is dimmed, one part is lit, and a card next
 * to it says what that part is for. Three steps only (Miller: few, short chunks): My stories, the questions,
 * the streak. Next / Back / Skip on the card, "Step n of 3", Esc skips; it shows once per browser and
 * "Take the tour" replays it. It never blocks the page for long: one click ends it.
 * Laws applied: Von Restorff (the lit area is the only bright thing), proximity (the card sits next to what it
 * explains), Fitts (large Next button where the eye already is), and user control (skip at any step).
 */
interface Step {
  target: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: "my-stories",
    title: "Build your stories in My stories",
    body: "Write each story once, in your own words, and we sort it into STAR: Situation, Task, Action, Result. Missing parts show up as questions, so you know what to add. One set of stories serves every role you prepare for.",
  },
  {
    target: "question",
    title: "Practise questions matched to you",
    body: "These questions come from the job description and your CV, with moments from your CV that could become your answer. Already have a story? Link it from My stories. No story yet? Build one for this question right here. Then press Practise to answer out loud and get feedback.",
  },
  {
    target: "streak",
    title: "Keep your prep streak",
    body: "Any prep counts: practising a question, marking a story ready or filling a gap. Click here any time to see your week, the days to your interview and your milestones.",
  },
];

const STORAGE_KEY = "tour:role-page:v1";
const PAD = 8;
const CARD_W = 340;
const GAP = 12;

function seen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* private mode: the tour may show again next time */
  }
}

const findTarget = (name: string) => document.querySelector<HTMLElement>(`[data-tour="${name}"]`);

export function GuidedTour() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  // Only the steps whose target is on the page (e.g. the streak chip appears once the session is known).
  const steps = useCallback(() => STEPS.filter((s) => findTarget(s.target)), []);

  const start = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    if (steps().length) setStep(0);
  }, [steps]);

  const end = useCallback(() => {
    markSeen();
    setStep(null);
    setRect(null);
    returnFocus.current?.focus?.();
  }, []);

  // First visit: start once the page has settled.
  useEffect(() => {
    if (seen()) return;
    const t = window.setTimeout(start, 700);
    return () => window.clearTimeout(t);
  }, [start]);

  const current = step === null ? null : (steps()[step] ?? null);
  const total = step === null ? 0 : steps().length;

  // Bring the lit part into view, then follow it on scroll and resize.
  useLayoutEffect(() => {
    if (!current) return;
    const el = findTarget(current.target);
    if (!el) return;
    const r0 = el.getBoundingClientRect();
    if (r0.top < 80 || r0.bottom > window.innerHeight - 40) el.scrollIntoView({ block: r0.height > window.innerHeight * 0.6 ? "start" : "center" });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [current]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
    nextRef.current?.focus();
  }, [step, rect === null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      // Keep keyboard focus inside the card while the tour is open.
      if (e.key === "Tab" && cardRef.current) {
        const items = [...cardRef.current.querySelectorAll<HTMLElement>("button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!cardRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, end]);

  const replay = (
    <button type="button" className={`${ui.link} self-start text-sm`} onClick={start} data-testid="tour-replay">
      Take the tour
    </button>
  );
  if (step === null || !current || !rect) return replay;

  // Card below the lit part when there is room, else above; clamped to the screen.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_W, vw - 32);
  const below = rect.bottom + PAD + GAP + cardH <= vh;
  const top = below ? rect.bottom + PAD + GAP : Math.max(16, rect.top - PAD - GAP - cardH);
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), vw - width - 16);
  const last = step === total - 1;

  return (
    <>
      {replay}
      {/* Click shield: the dimmed page is not clickable during the tour (Skip and Esc end it). */}
      <div className="fixed inset-0 z-50" aria-hidden="true" data-testid="tour-shield" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 rounded-xl ring-2 ring-indigo-400 transition-all duration-200 motion-reduce:transition-none"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgba(9, 9, 11, 0.6)",
        }}
        data-testid="tour-spotlight"
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="fixed z-50 flex flex-col gap-3 rounded-xl bg-white p-5 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
        style={{ top, left, width }}
        data-testid="tour-card"
        data-step={current.target}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          Step {step + 1} of {total}
        </p>
        <h2 id={titleId} className={ui.h2}>
          {current.title}
        </h2>
        <p id={bodyId} className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {current.body}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <button type="button" className={`${ui.link} text-sm`} onClick={end} data-testid="tour-skip">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" className={`${ui.btnSecondary} min-h-10 px-4`} onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button ref={nextRef} type="button" className={`${ui.btnPrimary} min-h-10 px-4`} onClick={() => (last ? end() : setStep(step + 1))} data-testid="tour-next">
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
