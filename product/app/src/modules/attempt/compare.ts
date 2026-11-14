import type { FeedbackMetricsRow, FeedbackPointRow } from "@/lib/db/types";
import { TOO_LONG_MS } from "@/modules/feedback/metrics";
import { formatMs } from "@/modules/feedback/transcript";

/**
 * Before vs after for two attempts at the same question (MF6, goal G6). Pure and deterministic:
 * the SAME checks are shown for both attempts, and issues are matched by stable `checkId`, never by
 * free text, so a reworded answer still counts as "fixed" or "still present" correctly.
 */
export type Direction = "better" | "worse" | "same";

export interface MetricDelta {
  key: "timeToDecision" | "ownership" | "length" | "answeredQuestion" | "competencyShown";
  label: string;
  before: string;
  after: string;
  direction: Direction;
}

export interface Comparison {
  metrics: MetricDelta[];
  resolved: { checkId: string; beforeQuote: string }[];
  stillPresent: { checkId: string; beforeQuote: string; afterQuote: string }[];
  newIssues: FeedbackPointRow[];
  strengths: FeedbackPointRow[];
  summary: string;
}

interface Side {
  metrics: Omit<FeedbackMetricsRow, "attemptId">;
  points: FeedbackPointRow[];
}

const POSITIVE_CHECKS = new Set(["strong_moment"]);
const verdict = (v: boolean | null, yes: string, no: string) => (v === null ? "unclear" : v ? yes : no);
const cmp = (before: number, after: number, lowerIsBetter: boolean): Direction =>
  before === after ? "same" : (after < before) === lowerIsBetter ? "better" : "worse";

function boolDirection(before: boolean | null, after: boolean | null): Direction {
  if (before === after || after === null || before === null) return "same";
  return after ? "better" : "worse";
}

function decisionDirection(before: number | null, after: number | null): Direction {
  if (before === null && after === null) return "same";
  if (before === null) return "better"; // a decision is now stated
  if (after === null) return "worse"; // the decision disappeared
  return Math.abs(after - before) < 1000 ? "same" : cmp(before, after, true);
}

/** Share of "I" among I + we: higher means the user's own role comes through more. */
function ownershipShare(m: Side["metrics"]): number {
  const total = m.iCount + m.weCount;
  return total === 0 ? 0 : m.iCount / total;
}

function lengthDirection(before: number, after: number): Direction {
  const overBefore = before > TOO_LONG_MS;
  const overAfter = after > TOO_LONG_MS;
  if (overBefore && !overAfter) return "better";
  if (!overBefore && overAfter) return "worse";
  if (overBefore && overAfter) return Math.abs(after - before) < 5000 ? "same" : cmp(before, after, true);
  return "same"; // both within the target: no nagging
}

export function compareAttempts(before: Side, after: Side): Comparison {
  const b = before.metrics;
  const a = after.metrics;
  const ownBefore = ownershipShare(b);
  const ownAfter = ownershipShare(a);

  const metrics: MetricDelta[] = [
    {
      key: "timeToDecision",
      label: "Time to your decision",
      before: b.timeToDecisionMs === null ? "not found" : formatMs(b.timeToDecisionMs),
      after: a.timeToDecisionMs === null ? "not found" : formatMs(a.timeToDecisionMs),
      direction: decisionDirection(b.timeToDecisionMs, a.timeToDecisionMs),
    },
    {
      key: "ownership",
      label: "“I” vs “we”",
      before: `${b.iCount} / ${b.weCount}`,
      after: `${a.iCount} / ${a.weCount}`,
      direction: Math.abs(ownAfter - ownBefore) < 0.05 ? "same" : ownAfter > ownBefore ? "better" : "worse",
    },
    { key: "length", label: "Length", before: formatMs(b.durationMs), after: formatMs(a.durationMs), direction: lengthDirection(b.durationMs, a.durationMs) },
    {
      key: "answeredQuestion",
      label: "Answered the question",
      before: verdict(b.answeredQuestion, "yes", "not quite"),
      after: verdict(a.answeredQuestion, "yes", "not quite"),
      direction: boolDirection(b.answeredQuestion, a.answeredQuestion),
    },
    {
      key: "competencyShown",
      label: "Showed the competency",
      before: verdict(b.competencyShown, "yes", "not yet"),
      after: verdict(a.competencyShown, "yes", "not yet"),
      direction: boolDirection(b.competencyShown, a.competencyShown),
    },
  ];

  const issuesBefore = before.points.filter((p) => !POSITIVE_CHECKS.has(p.checkId));
  const issuesAfter = after.points.filter((p) => !POSITIVE_CHECKS.has(p.checkId));
  const firstByCheck = (ps: FeedbackPointRow[]) => {
    const m = new Map<string, FeedbackPointRow>();
    for (const p of ps) if (!m.has(p.checkId)) m.set(p.checkId, p);
    return m;
  };
  const beforeByCheck = firstByCheck(issuesBefore);
  const afterByCheck = firstByCheck(issuesAfter);

  const resolved: Comparison["resolved"] = [];
  const stillPresent: Comparison["stillPresent"] = [];
  for (const [checkId, p] of beforeByCheck) {
    const later = afterByCheck.get(checkId);
    if (later) stillPresent.push({ checkId, beforeQuote: p.quote, afterQuote: later.quote });
    else resolved.push({ checkId, beforeQuote: p.quote });
  }
  const newIssues = [...afterByCheck.values()].filter((p) => !beforeByCheck.has(p.checkId));
  const strengths = after.points.filter((p) => POSITIVE_CHECKS.has(p.checkId));

  const total = beforeByCheck.size;
  const summary =
    total === 0 && newIssues.length === 0
      ? "No issues in either attempt."
      : `You fixed ${resolved.length} of ${total} issue${total === 1 ? "" : "s"}${newIssues.length ? `; ${newIssues.length} new one${newIssues.length === 1 ? "" : "s"} to look at` : ""}.`;

  return { metrics, resolved, stillPresent, newIssues, strengths, summary };
}

/** Plain-language names for check ids (shared by the compare page). */
export const CHECK_LABELS: Record<string, string> = {
  late_decision: "Decision arrives late",
  no_decision: "No clear decision",
  we_not_i: "More “we” than “I”",
  too_long: "Runs over two minutes",
  did_not_answer: "Didn't answer the question",
  competency_not_shown: "Competency not shown",
  vague_claim: "Vague claim",
  strong_moment: "Strong moment",
};
