import type { TimedWord } from "@/lib/db/types";
import type { Canonical } from "./transcript";

/**
 * Delivery metrics (MF4), computed in code from word timestamps, never by the model.
 * Targets come from the deck: "land the story in about two minutes".
 */
export const TARGET_MS = 120_000;
/** Flag as too long a little after the target, so a 2:05 answer is not nagged. (proposed) */
export const TOO_LONG_MS = 135_000;
/** A decision after this point, or after the second sentence, counts as late. (proposed) */
export const LATE_DECISION_MS = 30_000;

const I_FORMS = new Set(["i", "i'm", "i've", "i'd", "i'll", "me", "my", "mine", "myself"]);
const WE_FORMS = new Set(["we", "we're", "we've", "we'd", "we'll", "us", "our", "ours", "ourselves"]);

const clean = (w: string) => w.toLowerCase().replace(/[’]/g, "'").replace(/^[^a-z']+|[^a-z']+$/g, "");

export function countIWe(tokens: string[]): { iCount: number; weCount: number } {
  let iCount = 0;
  let weCount = 0;
  for (const t of tokens) {
    const c = clean(t);
    if (I_FORMS.has(c)) iCount++;
    else if (WE_FORMS.has(c)) weCount++;
  }
  return { iCount, weCount };
}

export const isWeForm = (token: string) => WE_FORMS.has(clean(token));

export interface DeliveryMetrics {
  timeToDecisionMs: number | null;
  iCount: number;
  weCount: number;
  durationMs: number;
}

export function computeDelivery(c: Canonical, words: TimedWord[], durationMs: number, decisionSentenceIndex: number | null): DeliveryMetrics {
  const s = decisionSentenceIndex !== null ? c.sentences[decisionSentenceIndex] : undefined;
  const lastEnd = words.length ? words[words.length - 1].end : 0;
  return {
    timeToDecisionMs: s ? words[s.firstWord].start : null,
    ...countIWe(words.map((w) => w.w)),
    durationMs: Math.max(durationMs, lastEnd),
  };
}
