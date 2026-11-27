"use client";

import Link from "next/link";
import { ui } from "@/components/ui";
import { addDays, type DayState, type StreakSummary } from "@/modules/streak/streak";
import { MilestoneTrack } from "./MilestoneTrack";
import { BriefcaseIcon, CheckIcon, FlameIcon, MoonIcon } from "./StreakIcons";
import { useStreak } from "./useStreak";

/**
 * Prep streak card on the interview hub: the run, the interview countdown, this week's days (with the rest
 * day), this interview as a milestone, the revive offer when a streak broke, and today's next step from the prep
 * list. Calm copy, no guilt.
 */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const REP_HINT = "Practice reps: get feedback on an answer, mark a story ready, or fill a gap.";

const DAY_STYLE: Record<DayState, string> = {
  active: "bg-indigo-600 text-white",
  revived: "border-2 border-indigo-400 text-indigo-700 dark:border-indigo-500 dark:text-indigo-300",
  rest: "border border-dashed border-zinc-400 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400",
  interview: "border-2 border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300",
  today: "border-2 border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300",
  missed: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  future: "bg-zinc-100 dark:bg-zinc-900",
  none: "bg-zinc-100 dark:bg-zinc-900",
};
const DAY_TEXT: Record<DayState, string> = {
  active: "prep done",
  revived: "revived",
  rest: "rest day",
  interview: "interview day, never breaks the streak",
  today: "today, nothing yet",
  missed: "missed",
  future: "coming up",
  none: "before your first prep",
};

function whenLabel(deadline: string | null, today: string): string {
  if (!deadline || deadline === addDays(today, 1)) return "by the end of tomorrow";
  if (deadline === today) return "by the end of today";
  return `by ${deadline}`;
}

function headline(s: StreakSummary): string {
  switch (s.status) {
    case "none":
      return "Start your prep streak";
    case "revivable":
      return "Your streak is on hold";
    case "broken":
      return "Start a new streak";
    default:
      return `${s.current}-day streak`;
  }
}

function message(s: StreakSummary): string {
  const r = s.revive;
  switch (s.status) {
    case "none":
      return "Do any prep today, like practising one question or adding a story, and your streak begins.";
    case "active_today":
      return "Today counts. Come back tomorrow to keep it going.";
    case "pending_today":
      return "Do any prep today to keep it going.";
    case "revivable":
      return `You missed ${plural(r!.lostDays, "day")} beyond your weekly rest day. Come back today and do ${plural(r!.repsNeeded, "practice rep")} ${whenLabel(null, s.today)} to bring back your ${r!.streakToRestore}-day streak.`;
    case "reviving": {
      const left = r!.repsNeeded - r!.repsDone;
      return `Welcome back. ${plural(left, "more practice rep")} ${whenLabel(r!.deadline, s.today)} brings back your ${r!.streakToRestore}-day streak (${r!.repsDone} of ${r!.repsNeeded} done).`;
    }
    case "broken":
      return `Your best run was ${plural(s.best, "day")}. Any prep today starts a new one.`;
  }
}

export function StreakCard({
  nextStep,
  interviewId,
  compact = false,
}: {
  nextStep?: { title: string; href: string; minutes: number } | null;
  /** The hub's interview: its date is shown as the milestone. */
  interviewId?: string;
  /** Inside the header's floating panel (2026-11-27): tighter spacing and a smaller headline. */
  compact?: boolean;
}) {
  const { streak: s } = useStreak();
  if (!s) return null;

  const milestone = s.milestones.find((m) => m.interviewId === interviewId) ?? null;
  const toGo = milestone ? (milestone.status === "done" ? null : milestone.daysToGo) : s.daysToInterview;
  const facts = [
    toGo === 0 ? "Interview today" : toGo !== null ? `${plural(toGo, "day")} to your interview` : null,
    s.best > s.current ? `best run ${plural(s.best, "day")}` : null,
  ].filter(Boolean);
  const reviveOn = s.status === "revivable" || s.status === "reviving";

  return (
    <section aria-labelledby="streak-title" className={`${ui.card} flex flex-col ${compact ? "gap-3 p-4" : "gap-4"}`} data-testid="streak-card" data-status={s.status}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="streak-title" className={`flex items-center gap-2 font-semibold tracking-tight ${compact ? "text-lg" : "text-2xl"}`}>
            <FlameIcon className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-indigo-600 dark:text-indigo-400`} />
            {headline(s)}
          </h2>
          {facts.length > 0 && <p className={ui.muted}>{facts.join(" · ")}</p>}
        </div>
        {s.status !== "none" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400" data-testid="streak-rest">
            <MoonIcon className="h-3.5 w-3.5" />
            {s.restUsedThisWeek ? "Rest day used this week" : "1 rest day left this week"}
          </span>
        )}
      </div>

      <ol className="grid grid-cols-7 gap-1" aria-label="This week">
        {s.week.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span className={`flex ${compact ? "h-8 w-8" : "h-9 w-9"} items-center justify-center rounded-full ${DAY_STYLE[d.interview && (d.state === "future" || d.state === "today") ? "interview" : d.state]}`} aria-hidden="true">
              {(d.state === "active" || d.state === "revived") && <CheckIcon />}
              {d.state === "rest" && <MoonIcon />}
              {d.state === "today" && !d.interview && <FlameIcon />}
              {d.interview && d.state !== "active" && <BriefcaseIcon />}
            </span>
            <span className={d.date === s.today ? "font-semibold text-indigo-700 dark:text-indigo-300" : d.interview ? "font-medium text-indigo-700 dark:text-indigo-300" : ""}>
              {d.date === s.today ? "Today" : d.interview ? "Interview" : d.label}
            </span>
            <span className="sr-only">
              {d.label}: {DAY_TEXT[d.state]}
              {d.interview && d.state !== "interview" ? ", interview day" : ""}
            </span>
          </li>
        ))}
      </ol>

      {milestone && <MilestoneTrack milestone={milestone} />}

      <div className={reviveOn ? "rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100" : "text-sm"} data-testid="streak-message">
        <p>{message(s)}</p>
        {reviveOn && <p className="mt-1 text-indigo-800/80 dark:text-indigo-200/80">{REP_HINT}</p>}
      </div>

      <div className="flex flex-col gap-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        {nextStep && s.status !== "active_today" && (
          <p className="text-sm">
            <span className="font-medium">Today&apos;s rep ({nextStep.minutes} min): </span>
            <Link href={nextStep.href} className={ui.link}>
              {nextStep.title}
            </Link>
          </p>
        )}
        <p className={ui.muted} data-testid="streak-week">
          This week: {plural(s.weekDays, "prep day")} · {plural(s.weekReps, "practice rep")}
        </p>
      </div>
    </section>
  );
}
