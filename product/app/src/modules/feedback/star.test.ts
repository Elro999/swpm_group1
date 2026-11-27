import { describe, expect, it } from "vitest";
import type { StarPart } from "@/lib/db/types";
import { synthesizeTranscript } from "@/modules/ai/mock/stt";
import { buildFeedback } from "./build";
import { answerStarParts, starPoints, summariseStar } from "./star";
import { buildCanonical } from "./transcript";

const NO_FIT = { decision_sentence_index: 0, answered_question: true, competency_shown: true, points: [] };

describe("STAR on a spoken answer", () => {
  it("summarises parts heard and missing", () => {
    expect(summariseStar(["situation", "action", "action", "result"])).toEqual({ present: ["situation", "action", "result"], missing: ["task"], outOfOrderAt: null });
  });

  it("flags going back to the situation or task after the action began", () => {
    expect(summariseStar(["situation", "task", "action", "situation", "result"]).outOfOrderAt).toBe(3);
    expect(summariseStar(["situation", "action", "result", "task"]).outOfOrderAt).toBe(3);
  });

  it("allows Action and Result to interleave, and a decision headline first", () => {
    expect(summariseStar(["situation", "task", "action", "result", "action", "result"]).outOfOrderAt).toBeNull();
    expect(summariseStar(["action", "situation", "task", "action", "result"]).outOfOrderAt).toBeNull();
  });

  it("maps sorted sentences onto the canonical transcript sentences", () => {
    const t = synthesizeTranscript("We had a hard launch. My task was to fix pricing. I ran the numbers. Sales grew 10%.");
    const c = buildCanonical(t.words);
    const sorted = c.sentences.map((s, i) => ({ start: s.start, end: s.end, part: (["situation", "task", "action", "result"] as StarPart[])[i] }));
    expect(answerStarParts(c, { sentences: sorted.map((s) => ({ ...s, actor: "own" as const, flags: [] })) })).toEqual(["situation", "task", "action", "result"]);
  });

  it("each missing part is a question pinned to the user's own words, never wording", () => {
    const t = synthesizeTranscript("The team was stuck on pricing. I ran the comparison myself. I spoke to six customers.");
    const c = buildCanonical(t.words);
    const points = starPoints(c, t.words, ["situation", "action", "action"]);
    expect(points.map((p) => p.checkId)).toEqual(["star_missing_task", "star_missing_result"]);
    for (const p of points) {
      expect(c.text).toContain(p.quote);
      expect(p.kind).toBe("delivery");
      expect(p.message).toMatch(/\?$/);
    }
    expect(points[1].quote).toContain("I spoke to six customers"); // Result is expected at the end
    expect(points[1].severity).toBe("fix");
  });

  it("buildFeedback adds STAR points only when the parts are known", () => {
    const t = synthesizeTranscript("I decided to cut the price. The team was stuck. I ran the comparison.");
    expect(buildFeedback(t.words, t.durationMs, NO_FIT).points.some((p) => p.checkId.startsWith("star_"))).toBe(false);
    const withStar = buildFeedback(t.words, t.durationMs, NO_FIT, { star: ["action", "situation", "action"] });
    expect(withStar.points.map((p) => p.checkId)).toEqual(expect.arrayContaining(["star_missing_task", "star_missing_result"]));
    // A wrong-length label list (stale data) is ignored rather than mis-pinned.
    expect(starPoints(buildCanonical(t.words), t.words, ["action"])).toEqual([]);
  });
});
