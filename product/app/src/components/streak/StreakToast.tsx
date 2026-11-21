"use client";

import { FlameIcon } from "./StreakIcons";
import { useStreak } from "./useStreak";

/**
 * Shown on the feedback screen once the view has been recorded (refreshStreak), so the user sees the
 * moment the day counted, or how close a revive is. Never shown from a stale load.
 */
export function StreakToast() {
  const { streak: s, refreshes } = useStreak();
  if (!s || refreshes === 0) return null;

  let text: string | null = null;
  if (s.status === "active_today") text = s.current === 1 ? "Day 1. Your prep streak has started." : `Day ${s.current}. Streak kept.`;
  if (s.status === "reviving" && s.revive) {
    const left = s.revive.repsNeeded - s.revive.repsDone;
    text = `${left} more practice rep${left === 1 ? "" : "s"} brings back your ${s.revive.streakToRestore}-day streak.`;
  }
  if (!text) return null;

  return (
    <p role="status" className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" data-testid="streak-toast">
      <FlameIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      {text}
    </p>
  );
}
