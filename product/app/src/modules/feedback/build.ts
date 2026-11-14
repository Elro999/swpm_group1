import type { LlmTaskMap } from "@/lib/contracts";
import type { FeedbackMetricsRow, NewFeedbackPoint, TimedWord } from "@/lib/db/types";
import { looksLikeRewrite } from "./guards";
import { computeDelivery, isWeForm, LATE_DECISION_MS, TARGET_MS, TOO_LONG_MS } from "./metrics";
import { buildCanonical, formatMs, pinQuote, pinSentence, type Pin } from "./transcript";

/**
 * Turns a transcript + the model's judgement into the feedback we store and show.
 * - Delivery checks (late_decision, no_decision, we_not_i, too_long) are generated HERE from timings.
 * - The model may only contribute FIT checks; each must quote the answer verbatim and not read like a rewrite.
 * - Every stored point has a verbatim quote and a time range (G2). Anything that fails is dropped and counted.
 */
const MODEL_CHECKS = new Set(["did_not_answer", "competency_not_shown", "vague_claim", "strong_moment"]);
const MAX_MODEL_POINTS = 4;

type FitOutput = LlmTaskMap["fit_feedback"]["output"];

export interface BuiltFeedback {
  metrics: Omit<FeedbackMetricsRow, "attemptId">;
  points: NewFeedbackPoint[];
  dropped: number;
}

const point = (checkId: string, kind: NewFeedbackPoint["kind"], severity: NewFeedbackPoint["severity"], message: string, pin: Pin): NewFeedbackPoint => ({
  checkId, kind, severity, message, quote: pin.quote, quoteStartMs: pin.startMs, quoteEndMs: pin.endMs,
});

export function buildFeedback(words: TimedWord[], durationMs: number, fit: FitOutput): BuiltFeedback {
  const c = buildCanonical(words);
  const points: NewFeedbackPoint[] = [];
  let dropped = 0;

  const decisionIdx =
    fit.decision_sentence_index !== null && fit.decision_sentence_index < c.sentences.length ? fit.decision_sentence_index : null;
  const delivery = computeDelivery(c, words, durationMs, decisionIdx);

  // --- Delivery (code-owned) ---
  if (c.sentences.length) {
    if (decisionIdx === null) {
      points.push(point("no_decision", "delivery", "fix", "We couldn't find a sentence where you state a decision you made. Which choice in this story was yours?", pinSentence(c, words, 0)));
    } else if (decisionIdx >= 2 || (delivery.timeToDecisionMs ?? 0) > LATE_DECISION_MS) {
      points.push(
        point(
          "late_decision",
          "delivery",
          "fix",
          `Your own decision first appears here, ${formatMs(delivery.timeToDecisionMs!)} in. What would change if the listener heard it in your first sentence?`,
          pinSentence(c, words, decisionIdx),
        ),
      );
    }
    if (delivery.weCount > delivery.iCount) {
      const idx = c.sentences.findIndex((s) => words.slice(s.firstWord, s.lastWord + 1).some((w) => isWeForm(w.w)));
      if (idx >= 0) {
        points.push(
          point("we_not_i", "delivery", "warn", `You said "we" ${delivery.weCount} times and "I" ${delivery.iCount} times. In this line, which part was your own action?`, pinSentence(c, words, idx)),
        );
      }
    }
    if (delivery.durationMs > TOO_LONG_MS) {
      const idx = Math.max(0, c.sentences.findIndex((s) => words[s.lastWord].end >= TARGET_MS));
      points.push(
        point("too_long", "delivery", "warn", `This answer runs ${formatMs(delivery.durationMs)}. Around here you pass two minutes: what could the listener do without?`, pinSentence(c, words, idx)),
      );
    }
  }

  // --- Fit (model-proposed, verified) ---
  let kept = 0;
  for (const p of fit.points) {
    const pin = MODEL_CHECKS.has(p.check_id) ? pinQuote(c, words, p.quote) : null;
    if (!pin || looksLikeRewrite(p.message, c.text) || kept >= MAX_MODEL_POINTS) {
      dropped++;
      continue;
    }
    points.push(point(p.check_id, "fit", p.severity, p.message.trim(), pin));
    kept++;
  }

  points.sort((a, b) => a.quoteStartMs - b.quoteStartMs);
  return {
    metrics: { ...delivery, answeredQuestion: fit.answered_question, competencyShown: fit.competency_shown },
    points,
    dropped,
  };
}
