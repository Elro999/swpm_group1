import { STAR_PARTS, type NewFeedbackPoint, type StarPart, type TimedWord } from "@/lib/db/types";
import { STAR_LABEL, STAR_QUESTION } from "@/modules/stories/star";
import type { StarStructure } from "@/modules/stories/structure";
import { pinSentence, type Canonical } from "./transcript";

/**
 * STAR on a spoken answer (2026-11-27). The SAME STAR rule as My stories, applied to the practice answer:
 * - which parts the listener heard (Situation, Task, Action, Result), from labels that sit on the user's own
 *   sentences (the story sorter's output, checked in code; nothing is rewritten);
 * - whether the answer flows in STAR order: going back to the Situation or Task after the Action or Result has
 *   started is flagged. Action and Result may interleave ("I did X, which led to Y"), and a decision headline in
 *   the first sentence is allowed, because the product also asks for the decision early (time to decision).
 * Checks are code-owned (kind "delivery"), pinned to a real sentence and phrased as questions, like the others.
 */
const RANK: Record<StarPart, number> = { situation: 0, task: 1, action: 2, result: 3 };

/** The STAR part of each canonical sentence: the sorted sentence that overlaps it most (sorting covers every sentence). */
export function answerStarParts(c: Canonical, structure: Pick<StarStructure, "sentences">): StarPart[] {
  let previous: StarPart = "situation";
  return c.sentences.map((s) => {
    let best: StarPart | null = null;
    let bestOverlap = 0;
    for (const t of structure.sentences) {
      const overlap = Math.min(t.end, s.end) - Math.max(t.start, s.start);
      if (overlap > bestOverlap && t.part) {
        best = t.part;
        bestOverlap = overlap;
      }
    }
    previous = best ?? previous;
    return previous;
  });
}

export interface StarSummary {
  /** Parts heard, in S-T-A-R order. */
  present: StarPart[];
  missing: StarPart[];
  /** Index of the first sentence that goes back to the Situation or Task after the Action or Result began; null when in order. */
  outOfOrderAt: number | null;
}

export function summariseStar(parts: StarPart[]): StarSummary {
  const present = STAR_PARTS.filter((p) => parts.includes(p));
  let reached = -1;
  let outOfOrderAt: number | null = null;
  parts.forEach((p, i) => {
    // A decision or result headline in the first sentence is fine (decision first); judge order from there on.
    if (i === 0 && parts.length > 1 && RANK[p] >= RANK.action) return;
    if (outOfOrderAt === null && RANK[p] <= RANK.task && reached >= RANK.action) outOfOrderAt = i;
    reached = Math.max(reached, RANK[p]);
  });
  return { present, missing: STAR_PARTS.filter((p) => !present.includes(p)), outOfOrderAt };
}

export const STAR_CHECK_IDS = ["star_missing_situation", "star_missing_task", "star_missing_action", "star_missing_result", "star_order"] as const;

/** Where a missing part would have been expected, so the point sits on a real sentence the user said. */
function anchorFor(part: StarPart, parts: StarPart[]): number {
  const last = parts.length - 1;
  const first = (p: StarPart) => parts.indexOf(p);
  switch (part) {
    case "situation":
      return 0;
    case "task":
      return Math.max(0, first("action") > 0 ? first("action") - 1 : 0);
    case "action":
      return first("result") >= 0 ? first("result") : last;
    case "result":
      return last;
  }
}

export function starPoints(c: Canonical, words: TimedWord[], parts: StarPart[] | null): NewFeedbackPoint[] {
  if (!parts || !parts.length || parts.length !== c.sentences.length) return [];
  const { missing, outOfOrderAt } = summariseStar(parts);
  const points: NewFeedbackPoint[] = [];
  const add = (checkId: string, severity: NewFeedbackPoint["severity"], message: string, idx: number) => {
    const pin = pinSentence(c, words, idx);
    points.push({ checkId, kind: "delivery", severity, message, quote: pin.quote, quoteStartMs: pin.startMs, quoteEndMs: pin.endMs });
  };
  for (const p of missing) {
    const severity = p === "action" || p === "result" ? "fix" : "warn";
    add(`star_missing_${p}`, severity, `We didn't hear a ${STAR_LABEL[p]} in this answer. ${STAR_QUESTION[p]}`, anchorFor(p, parts));
  }
  if (outOfOrderAt !== null) {
    const p = parts[outOfOrderAt];
    add(
      "star_order",
      "warn",
      `Here you go back to the ${STAR_LABEL[p]} after describing what you did. Would the listener follow more easily if this came before your actions?`,
      outOfOrderAt,
    );
  }
  return points;
}
