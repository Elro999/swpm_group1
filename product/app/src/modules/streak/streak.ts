import type { EventRow } from "@/lib/db/types";

/**
 * Prep streak (gamification, added 2026-11-21). DERIVED from the session's events, never stored, like the
 * prep list: it cannot drift and needs no new table. Pure: give it events, the user's timezone and "now".
 *
 * Rules (team decision, 2026-11-21; tune the constants below):
 * 1. A day counts when the user does any prep ACTION that day (adding an interview counts: it shows intent).
 *    Page views fired automatically (questions_shown, prep_list_viewed) and system steps do not count.
 * 2. Rest day: one missed day per calendar week (Mon–Sun) is forgiven automatically.
 * 3. Any further missed day breaks the streak. It can be REVIVED if the gap is at most MAX_REVIVE_DAYS
 *    unforgiven days: on coming back, do one PRACTICE REP per lost day by the end of the next day.
 *    Practice reps are the deeper actions (feedback watched on an answer, story marked ready, gap filled),
 *    so a revive costs real prep, not a click.
 * 4. The streak number is the count of days with prep in the current run (rest and revived days bridge the
 *    run but do not add to it).
 * Days are calendar days in the user's own timezone, so practice at 00:30 counts for the day it happened.
 */

/** Events that show prep intent: any of these makes the day count. */
export const PREP_ACTIONS = [
  "interview_added",
  "story_added",
  "story_marked_ready",
  "gap_story_filled",
  "recording_started",
  "retry_started",
  "feedback_viewed",
  "point_marked_not_useful",
  "compare_viewed",
] as const;

/** Deeper practice: what a revive costs (one per lost day). feedback_viewed fires once per attempt. */
export const PRACTICE_REPS = ["feedback_viewed", "story_marked_ready", "gap_story_filled"] as const;

/** Missed days forgiven per Mon–Sun week. */
export const REST_DAYS_PER_WEEK = 1;
/** Longest gap (unforgiven missed days) that can still be revived. */
export const MAX_REVIVE_DAYS = 3;
/** Days after the comeback day the user has to finish the revive (1 = comeback day + the next day). */
export const REVIVE_EXTRA_DAYS = 1;

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export type StreakStatus =
  | "none" // no prep yet
  | "active_today" // today already counts
  | "pending_today" // streak alive, nothing yet today
  | "revivable" // broken by recent missed days, can still be revived by coming back
  | "reviving" // came back; practice reps due to restore the old run
  | "broken"; // gap too long; a new streak starts with the next action

export type DayState = "active" | "rest" | "missed" | "revived" | "today" | "future" | "none";

export interface StreakRevive {
  /** Missed days that were not forgiven. */
  lostDays: number;
  repsNeeded: number;
  repsDone: number;
  /** Last local day (YYYY-MM-DD) the revive can be finished; null before the user has come back. */
  deadline: string | null;
  /** The run that comes back (added to the current one) when the revive succeeds. */
  streakToRestore: number;
}

export interface StreakSummary {
  status: StreakStatus;
  current: number;
  best: number;
  today: string;
  timeZone: string;
  restUsedThisWeek: boolean;
  revive: StreakRevive | null;
  /** Monday to Sunday of the current week. */
  week: { date: string; label: string; state: DayState }[];
  /** Days with prep and practice reps so far this week. */
  weekDays: number;
  weekReps: number;
  /** Days to the nearest interview that is today or later; null when no interview date is set. */
  daysToInterview: number | null;
}

export interface StreakInput {
  events: Pick<EventRow, "name" | "at" | "props">[];
  now: Date;
  timeZone?: string;
  /** Interview dates (YYYY-MM-DD) for the countdown. */
  interviewDates?: (string | null)[];
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACTIONS = new Set<string>(PREP_ACTIONS);
const REPS = new Set<string>(PRACTICE_REPS);

/** A valid IANA timezone, or the default (bad input must never break the page). */
export function safeTimeZone(tz: unknown): string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** The calendar day (YYYY-MM-DD) of an instant in a timezone. */
export function localDay(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => new Date(toUtc(day) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((toUtc(a) - toUtc(b)) / DAY_MS);
/** Monday of the day's week. */
export const weekOf = (day: string) => addDays(day, -((new Date(toUtc(day)).getUTCDay() + 6) % 7));

export function computeStreak(input: StreakInput): StreakSummary {
  const timeZone = safeTimeZone(input.timeZone);
  const today = localDay(input.now, timeZone);

  // Per local day: did anything count, and how many practice reps.
  const actions = new Map<string, number>();
  const reps = new Map<string, number>();
  for (const e of input.events) {
    if (!ACTIONS.has(e.name)) continue;
    const day = localDay(e.at, timeZone);
    if (day > today) continue; // clock skew: ignore the future
    actions.set(day, (actions.get(day) ?? 0) + 1);
    if (REPS.has(e.name)) reps.set(day, (reps.get(day) ?? 0) + 1);
  }

  const weekStart = weekOf(today);
  const daysToInterview = nearestInterview(input.interviewDates ?? [], today);

  if (actions.size === 0) {
    return {
      status: "none", current: 0, best: 0, today, timeZone, restUsedThisWeek: false, revive: null,
      week: WEEKDAYS.map((label, i) => {
        const date = addDays(weekStart, i);
        return { date, label, state: date === today ? "today" : date > today ? "future" : "none" };
      }),
      weekDays: 0, weekReps: 0, daysToInterview,
    };
  }

  const first = [...actions.keys()].sort()[0];
  const restWeeks = new Set<string>();
  const restDays = new Set<string>();
  const revivedDays = new Set<string>();

  let count = 0; // days with prep in the current run
  let best = 0;
  let gap: string[] = []; // unforgiven missed days since the last active day
  // A revive in progress: the old run waiting to be restored.
  let pending: { bank: number; lost: string[]; deadline: string; done: number } | null = null;

  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (actions.has(d)) {
      if (gap.length > 0) {
        // Coming back after lost days: start a new run; the old one can come back if the gap was short.
        pending = gap.length <= MAX_REVIVE_DAYS && count > 0 ? { bank: count, lost: gap, deadline: addDays(d, REVIVE_EXTRA_DAYS), done: 0 } : null;
        count = 0;
        gap = [];
      }
      count += 1;
      if (pending) {
        pending.done += reps.get(d) ?? 0;
        if (pending.done >= pending.lost.length) {
          count += pending.bank;
          pending.lost.forEach((x) => revivedDays.add(x));
          pending = null;
        }
      }
    } else if (d !== today) {
      // A missed day (today is still in progress, so it is never a miss).
      const wk = weekOf(d);
      const used = [...restDays].filter((x) => weekOf(x) === wk).length;
      if (used < REST_DAYS_PER_WEEK) {
        restWeeks.add(wk);
        restDays.add(d);
      } else {
        gap.push(d);
      }
    }
    if (pending && d === pending.deadline && d !== today) pending = null; // revive window closed
    best = Math.max(best, count);
  }

  let status: StreakStatus;
  let current = count;
  let revive: StreakRevive | null = null;
  if (gap.length > 0) {
    if (gap.length <= MAX_REVIVE_DAYS && count > 0) {
      status = "revivable";
      revive = { lostDays: gap.length, repsNeeded: gap.length, repsDone: 0, deadline: null, streakToRestore: count };
    } else {
      status = "broken";
    }
    current = 0;
  } else if (pending) {
    status = "reviving";
    revive = { lostDays: pending.lost.length, repsNeeded: pending.lost.length, repsDone: pending.done, deadline: pending.deadline, streakToRestore: pending.bank };
  } else {
    status = actions.has(today) ? "active_today" : "pending_today";
  }

  const week = WEEKDAYS.map((label, i) => {
    const date = addDays(weekStart, i);
    let state: DayState;
    if (date > today) state = "future";
    else if (actions.has(date)) state = "active";
    else if (date === today) state = "today";
    else if (date < first) state = "none";
    else if (restDays.has(date)) state = "rest";
    else if (revivedDays.has(date)) state = "revived";
    else state = "missed";
    return { date, label, state };
  });

  let weekDays = 0;
  let weekReps = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    if (actions.has(date)) weekDays += 1;
    weekReps += reps.get(date) ?? 0;
  }

  return { status, current, best, today, timeZone, restUsedThisWeek: restWeeks.has(weekStart), revive, week, weekDays, weekReps, daysToInterview };
}

function nearestInterview(dates: (string | null)[], today: string): number | null {
  const ahead = dates
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .map((d) => diffDays(d, today))
    .filter((n) => n >= 0);
  return ahead.length ? Math.min(...ahead) : null;
}
