import type { AttemptRow, AttemptStatus, FeedbackMetricsRow, QuestionRow, Repo, TimedWord } from "@/lib/db/types";
import { buildCanonical } from "@/modules/feedback/transcript";

/**
 * What the browser receives about an attempt. Safe to import as a TYPE from client components.
 * Contains the user's own transcript (it is theirs) but never audio keys or other users' data.
 */
export interface AttemptView {
  id: string;
  attemptNo: number;
  status: AttemptStatus;
  error: string | null;
  question: { id: string; text: string; interviewId: string };
  answer: {
    words: TimedWord[];
    sentences: { text: string; firstWord: number; lastWord: number; startMs: number; endMs: number }[];
    durationMs: number;
  } | null;
  hasAnswerAudio: boolean;
  followup: { question: string; quote: string; skipped: boolean; transcript: string | null; hasAudio: boolean } | null;
  feedback: {
    metrics: Omit<FeedbackMetricsRow, "attemptId">;
    points: {
      id: string;
      checkId: string;
      kind: "delivery" | "fit";
      severity: "info" | "warn" | "fix";
      message: string;
      quote: string;
      startMs: number;
      endMs: number;
      notUseful: boolean;
    }[];
  } | null;
}

export async function buildAttemptView(repo: Repo, attempt: AttemptRow, question: QuestionRow): Promise<AttemptView> {
  let answer: AttemptView["answer"] = null;
  if (attempt.answerWords) {
    const c = buildCanonical(attempt.answerWords);
    const w = attempt.answerWords;
    answer = {
      words: w,
      sentences: c.sentences.map((s) => ({ text: s.text, firstWord: s.firstWord, lastWord: s.lastWord, startMs: w[s.firstWord].start, endMs: w[s.lastWord].end })),
      durationMs: attempt.answerDurationMs ?? w.at(-1)?.end ?? 0,
    };
  }

  let feedback: AttemptView["feedback"] = null;
  if (attempt.status === "ready") {
    const fb = await repo.feedback.get(attempt.id);
    if (fb.metrics) {
      const ratings = await repo.pointRatings.listByPoints(fb.points.map((p) => p.id));
      const notUseful = new Set(ratings.filter((r) => r.notUseful).map((r) => r.feedbackPointId));
      const { attemptId: _omit, ...metrics } = fb.metrics;
      void _omit;
      feedback = {
        metrics,
        points: fb.points.map((p) => ({
          id: p.id, checkId: p.checkId, kind: p.kind, severity: p.severity, message: p.message,
          quote: p.quote, startMs: p.quoteStartMs, endMs: p.quoteEndMs, notUseful: notUseful.has(p.id),
        })),
      };
    }
  }

  return {
    id: attempt.id,
    attemptNo: attempt.attemptNo,
    status: attempt.status,
    error: attempt.error,
    question: { id: question.id, text: question.text, interviewId: question.interviewId },
    answer,
    hasAnswerAudio: Boolean(attempt.answerAudioKey),
    followup: attempt.followupText
      ? {
          question: attempt.followupText,
          quote: attempt.followupQuote ?? "",
          skipped: attempt.followupSkipped,
          transcript: attempt.followupWords ? buildCanonical(attempt.followupWords).text : null,
          hasAudio: Boolean(attempt.followupAudioKey),
        }
      : null,
    feedback,
  };
}
