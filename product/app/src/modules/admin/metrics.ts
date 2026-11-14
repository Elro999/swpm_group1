import type { EventRow, SessionRow, StoryState } from "@/lib/db/types";

/**
 * The MVP hypothesis metrics (PRD §2 and §7; doc 02 §7), computed from events and rows. Pure.
 * With ≤ 25 users these are directional, not statistically conclusive (Session 6: analytics locates,
 * interviews explain). Thresholds marked (proposed) in the PRD are proposals.
 */
export type MetricStatus = "pass" | "fail" | "no_data";

export interface MetricRow {
  key: string;
  label: string;
  numerator: number;
  denominator: number;
  value: number | null;
  display: string;
  target: string;
  status: MetricStatus;
  note?: string;
}

export interface MetricsInput {
  sessions: Pick<SessionRow, "id" | "createdAt">[];
  events: EventRow[];
  stories: { state: StoryState }[];
  feedbackPoints: number;
  notUsefulPoints: number;
  now: Date;
}

const DAY_MS = 86_400_000;
const FIVE_MIN_MS = 5 * 60_000;
const pct = (v: number) => `${Math.round(v * 100)}%`;

function ratio(key: string, label: string, num: number, den: number, threshold: number, target: string, higherIsBetter = true, note?: string): MetricRow {
  if (den === 0) return { key, label, numerator: num, denominator: den, value: null, display: "no data yet", target, status: "no_data", note };
  const value = num / den;
  const ok = higherIsBetter ? value >= threshold : value <= threshold;
  return { key, label, numerator: num, denominator: den, value, display: pct(value), target, status: ok ? "pass" : "fail", note };
}

export function computeMetrics(input: MetricsInput): MetricRow[] {
  const bySession = new Map<string, Map<string, EventRow[]>>();
  for (const e of input.events) {
    if (!e.sessionId) continue;
    const m = bySession.get(e.sessionId) ?? new Map<string, EventRow[]>();
    m.set(e.name, [...(m.get(e.name) ?? []), e]);
    bySession.set(e.sessionId, m);
  }
  const has = (sid: string, name: string) => Boolean(bySession.get(sid)?.get(name)?.length);
  const ids = input.sessions.map((s) => s.id);

  // G1: first pinned feedback within 5 minutes of landing (proposed: ≥ 80% of sessions that got feedback).
  const firstTimes = ids
    .map((sid) => bySession.get(sid)?.get("first_feedback_viewed")?.[0]?.props.ms_since_start)
    .filter((v): v is number => typeof v === "number");
  const sorted = [...firstTimes].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
  const g1 = ratio(
    "first_feedback_5min",
    "First feedback within 5 minutes of landing",
    firstTimes.filter((ms) => ms <= FIVE_MIN_MS).length,
    firstTimes.length,
    0.8,
    "≥ 80% (proposed)",
    true,
    median === null ? undefined : `Median ${Math.round(median / 1000)} s`,
  );

  // MF hypothesis: ≥ 60% retry after feedback.
  const gotFeedback = ids.filter((sid) => has(sid, "feedback_viewed"));
  const retry = ratio("retry_after_feedback", "Retry after feedback", gotFeedback.filter((sid) => has(sid, "retry_started")).length, gotFeedback.length, 0.6, "≥ 60%");

  // SB hypothesis: ≥ 60% of stories marked ready.
  const stories = ratio("stories_ready", "Stories marked ready", input.stories.filter((s) => s.state === "ready").length, input.stories.length, 0.6, "≥ 60%");

  // SD hypothesis: ≥ 1 gap filled per user (users = sessions that added an interview).
  const users = ids.filter((sid) => has(sid, "interview_added"));
  const filled = users.reduce((n, sid) => n + (bySession.get(sid)?.get("gap_story_filled")?.length ?? 0), 0);
  const gaps: MetricRow =
    users.length === 0
      ? { key: "gaps_filled", label: "Gaps filled per user", numerator: filled, denominator: 0, value: null, display: "no data yet", target: "≥ 1 per user", status: "no_data" }
      : {
          key: "gaps_filled",
          label: "Gaps filled per user",
          numerator: filled,
          denominator: users.length,
          value: filled / users.length,
          display: `${(filled / users.length).toFixed(1)} per user`,
          target: "≥ 1 per user",
          status: filled / users.length >= 1 ? "pass" : "fail",
        };

  // PL hypothesis: ≥ 40% return in week 2 unprompted (sessions at least 7 days old).
  const old = input.sessions.filter((s) => input.now.getTime() - s.createdAt.getTime() >= 7 * DAY_MS);
  const returnedWeek2 = old.filter((s) =>
    (bySession.get(s.id)?.get("session_returned") ?? []).some((e) => {
      const d = e.props.days_since_start;
      return typeof d === "number" && d >= 7 && d <= 14;
    }),
  );
  const week2 = ratio("week2_return", "Came back in week 2", returnedWeek2.length, old.length, 0.4, "≥ 40%");

  // Counter-metric: feedback marked "not useful" (proposed ≤ 20%; lower is better).
  const notUseful = ratio("not_useful_rate", "Feedback points marked “not useful” (counter-metric)", input.notUsefulPoints, input.feedbackPoints, 0.2, "≤ 20% (proposed)", false);

  return [g1, retry, stories, gaps, week2, notUseful];
}
