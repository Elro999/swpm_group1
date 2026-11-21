import { describe, expect, it } from "vitest";
import type { FeedbackMetricsRow, FeedbackPointRow } from "@/lib/db/types";
import { compareAttempts } from "./compare";

const metrics = (m: Partial<FeedbackMetricsRow>): Omit<FeedbackMetricsRow, "attemptId"> => ({
  timeToDecisionMs: 40_000,
  iCount: 2,
  weCount: 6,
  durationMs: 150_000,
  answeredQuestion: true,
  competencyShown: false,
  ...m,
});

let n = 0;
const point = (checkId: string, quote = "some words", severity: FeedbackPointRow["severity"] = "fix"): FeedbackPointRow => ({
  id: `p${n++}`,
  attemptId: "a",
  checkId,
  kind: ["late_decision", "no_decision", "we_not_i", "too_long"].includes(checkId) ? "delivery" : "fit",
  severity,
  message: "m",
  quote,
  quoteStartMs: 0,
  quoteEndMs: 1000,
});

describe("compareAttempts (MF6, G6: same checks, before vs after)", () => {
  it("marks each metric better, worse or same in the right direction", () => {
    const c = compareAttempts(
      { metrics: metrics({}), points: [] },
      { metrics: metrics({ timeToDecisionMs: 2_000, iCount: 6, weCount: 1, durationMs: 100_000, competencyShown: true }), points: [] },
    );
    const by = Object.fromEntries(c.metrics.map((m) => [m.key, m]));
    expect(by.timeToDecision).toMatchObject({ direction: "better", before: "0:40", after: "0:02" });
    expect(by.ownership).toMatchObject({ direction: "better", before: "2 / 6", after: "6 / 1" });
    expect(by.length).toMatchObject({ direction: "better", before: "2:30", after: "1:40" });
    expect(by.competencyShown).toMatchObject({ direction: "better", before: "not yet", after: "yes" });
    expect(by.answeredQuestion.direction).toBe("same");
  });

  it("treats finding a decision as better and losing it as worse", () => {
    const found = compareAttempts({ metrics: metrics({ timeToDecisionMs: null }), points: [] }, { metrics: metrics({ timeToDecisionMs: 9_000 }), points: [] });
    expect(found.metrics.find((m) => m.key === "timeToDecision")!.direction).toBe("better");
    const lost = compareAttempts({ metrics: metrics({ timeToDecisionMs: 9_000 }), points: [] }, { metrics: metrics({ timeToDecisionMs: null }), points: [] });
    expect(lost.metrics.find((m) => m.key === "timeToDecision")!.direction).toBe("worse");
  });

  it("does not nag about length while both answers are within the target", () => {
    const c = compareAttempts({ metrics: metrics({ durationMs: 90_000 }), points: [] }, { metrics: metrics({ durationMs: 110_000 }), points: [] });
    expect(c.metrics.find((m) => m.key === "length")!.direction).toBe("same");
  });

  it("matches issues by check id: resolved, still present, and new", () => {
    const c = compareAttempts(
      { metrics: metrics({}), points: [point("late_decision"), point("we_not_i"), point("vague_claim", "a lot of data", "warn")] },
      { metrics: metrics({}), points: [point("we_not_i", "we looked at"), point("too_long", "and then", "warn"), point("strong_moment", "I decided", "info")] },
    );
    expect(c.resolved.map((r) => r.checkId)).toEqual(["late_decision", "vague_claim"]);
    expect(c.stillPresent.map((s) => s.checkId)).toEqual(["we_not_i"]);
    expect(c.stillPresent[0]).toMatchObject({ beforeQuote: "some words", afterQuote: "we looked at" });
    expect(c.newIssues.map((p) => p.checkId)).toEqual(["too_long"]);
    // Strengths are reported separately, never as "issues".
    expect(c.strengths.map((p) => p.checkId)).toEqual(["strong_moment"]);
  });

  it("summarises the outcome in one line", () => {
    const fixed = compareAttempts({ metrics: metrics({}), points: [point("late_decision")] }, { metrics: metrics({}), points: [] });
    expect(fixed.summary).toMatch(/fixed 1 of 1/i);
    const none = compareAttempts({ metrics: metrics({}), points: [] }, { metrics: metrics({}), points: [] });
    expect(none.summary).toMatch(/no issues/i);
  });
});
