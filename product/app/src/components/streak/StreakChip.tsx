"use client";

import { FlameIcon } from "./StreakIcons";
import { useStreak } from "./useStreak";

/**
 * Header chip: the prep streak at a glance on every page. Filled when today already counts, outlined while
 * today is still open, "Revive" when a broken streak can come back. Hidden before any prep or when broken.
 */
export function StreakChip() {
  const { streak } = useStreak();
  if (!streak) return null;
  const { status, current, revive } = streak;
  if (status === "none" || status === "broken") return null;

  if (status === "revivable") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-indigo-300 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:border-indigo-700 dark:text-indigo-200"
        title={`Your ${revive?.streakToRestore}-day streak can still be revived`}
        data-testid="streak-chip"
      >
        <FlameIcon className="h-3.5 w-3.5" />
        Revive
      </span>
    );
  }

  const done = status === "active_today";
  const label = `Prep streak: ${current} day${current === 1 ? "" : "s"}${done ? ", today counts" : ", nothing yet today"}`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        done
          ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
          : "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
      }`}
      title={label}
      aria-label={label}
      data-testid="streak-chip"
    >
      <FlameIcon className="h-3.5 w-3.5" />
      {current}
    </span>
  );
}
