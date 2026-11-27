"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { StreakCard } from "./StreakCard";
import { FlameIcon } from "./StreakIcons";
import { useStreak } from "./useStreak";

/**
 * Header chip: the prep streak at a glance on every page (filled when today already counts, outlined while
 * today is still open, "Revive" when a broken streak can come back, "Streak" before any prep).
 * Since 2026-11-27 it is a button: the full streak (week, interview countdown, milestone, revive) opens in a
 * floating panel next to it instead of a large card in the middle of the role page, so the questions keep the
 * page (the streak is secondary; progressive disclosure). Esc, a click outside or the button close it.
 */
const INTERVIEW_PATH = /^\/i\/([0-9a-f-]{36})(?:\/|$)/i;

export function StreakChip() {
  const { streak } = useStreak();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on navigation.
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  if (!streak) return null;
  const { status, current, revive } = streak;
  const interviewId = pathname?.match(INTERVIEW_PATH)?.[1];

  let content: React.ReactNode;
  let label: string;
  let cls: string;
  if (status === "revivable") {
    content = "Revive";
    label = `Your ${revive?.streakToRestore}-day streak can still be revived`;
    cls = "border border-indigo-300 text-indigo-800 dark:border-indigo-700 dark:text-indigo-200";
  } else if (status === "none" || status === "broken") {
    content = "Streak";
    label = status === "none" ? "Start your prep streak" : "Start a new streak";
    cls = "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300";
  } else {
    const done = status === "active_today";
    content = current;
    label = `Prep streak: ${current} day${current === 1 ? "" : "s"}${done ? ", today counts" : ", nothing yet today"}`;
    cls = done
      ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
      : "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300";
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium hover:ring-2 hover:ring-indigo-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:ring-indigo-900 ${cls}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        onClick={() => setOpen((o) => !o)}
        data-testid="streak-chip"
        data-tour="streak"
      >
        <FlameIcon className="h-3.5 w-3.5" />
        {content}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Your prep streak"
          className="fixed inset-x-4 top-20 z-40 rounded-xl shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
          data-testid="streak-popover"
        >
          <StreakCard interviewId={interviewId} compact />
        </div>
      )}
    </div>
  );
}
