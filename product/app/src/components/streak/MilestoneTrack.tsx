import type { InterviewMilestone } from "@/modules/streak/streak";
import { BriefcaseIcon } from "./StreakIcons";

/**
 * The interview as a milestone: one dot per day from adding the interview to the day before it, ending in
 * the interview itself. Before the date it shows the road so far; on the day, a send-off; afterwards, the result.
 */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const DOT: Record<InterviewMilestone["track"][number]["state"], string> = {
  prepped: "bg-indigo-600",
  missed: "bg-zinc-300 dark:bg-zinc-700",
  today: "border-2 border-indigo-600 dark:border-indigo-400",
  future: "border border-zinc-300 dark:border-zinc-700",
};
const DOT_TEXT = { prepped: "prepped", missed: "no prep", today: "today", future: "coming up" } as const;

function prettyDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function summary(m: InterviewMilestone): string {
  const tally = `${m.preppedDays} of ${plural(m.windowDays, "day")}`;
  if (m.status === "today") return m.windowDays ? `Interview today. You prepped ${tally} for it. Good luck.` : "Interview today. Good luck.";
  if (m.status === "done") return `Milestone reached: you prepped ${tally} before this interview.`;
  if (m.elapsedDays === 0) return `${plural(m.daysToGo, "day")} to go. Every day you prep fills in a dot on the way.`;
  return `Prepped ${m.preppedDays} of ${plural(m.elapsedDays, "day")} so far · ${plural(m.daysToGo, "day")} to go.`;
}

export function MilestoneTrack({ milestone: m }: { milestone: InterviewMilestone }) {
  if (m.status === "done" && m.windowDays === 0) return null; // logged after the date: nothing to show
  const hidden = m.windowDays - m.track.length;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800" data-testid="streak-milestone" data-status={m.status}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Milestone · interview on {prettyDate(m.date)}</p>
      {m.track.length > 0 && (
        <ol className="flex flex-wrap items-center gap-1.5" aria-label="Days on the way to your interview">
          {hidden > 0 && <li className="text-xs text-zinc-500">+{hidden} earlier</li>}
          {m.track.map((d) => (
            <li key={d.date} className={`h-3 w-3 rounded-full ${DOT[d.state]}`} title={`${prettyDate(d.date)}: ${DOT_TEXT[d.state]}`}>
              <span className="sr-only">
                {prettyDate(d.date)}: {DOT_TEXT[d.state]}
              </span>
            </li>
          ))}
          <li className="ml-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
            <BriefcaseIcon className="h-3.5 w-3.5" />
            Interview
          </li>
        </ol>
      )}
      <p className="text-sm" data-testid="streak-milestone-summary">
        {summary(m)}
      </p>
    </div>
  );
}
