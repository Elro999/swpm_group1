import type { AttemptRow, AttemptStatus, FeedbackMetricsRow, QuestionRow, Repo, StarPart, TimedWord } from "@/lib/db/types";
import { summariseStar } from "@/modules/feedback/star";
import { buildCanonical } from "@/modules/feedback/transcript";
import { missingParts, storyName } from "@/modules/stories/star";
import { findSimilarStory } from "./story";

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
    /** `part`: the STAR part of the sentence, when the answer was sorted (null on older attempts). */
    sentences: { text: string; firstWord: number; lastWord: number; startMs: number; endMs: number; part: StarPart | null }[];
    durationMs: number;
  } | null;
  hasAnswerAudio: boolean;
  followup: { question: string; quote: string; skipped: boolean; transcript: string | null; hasAudio: boolean } | null;
  /** STAR across the answer (null when it was not sorted): parts heard and whether it flows in order. */
  star: { present: StarPart[]; missing: StarPart[]; outOfOrderAt: number | null } | null;
  /**
   * My stories link (ready attempts only). `saved`: the story this answer is in. Otherwise `similar`: an existing
   * story it looks like (offer combine / save as new); `canSave`: it can be saved as a new story.
   */
  story: {
    saved: { id: string; name: string; missing: StarPart[] } | null;
    similar: { id: string; name: string } | null;
    canSave: boolean;
  } | null;
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

export async function buildAttemptView(repo: Repo, attempt: AttemptRow, question: QuestionRow, sessionId?: string): Promise<AttemptView> {
  let answer: AttemptView["answer"] = null;
  let star: AttemptView["star"] = null;
  if (attempt.answerWords) {
    const c = buildCanonical(attempt.answerWords);
    const w = attempt.answerWords;
    const parts = attempt.answerStar && attempt.answerStar.length === c.sentences.length ? attempt.answerStar : null;
    if (parts) star = summariseStar(parts);
    answer = {
      words: w,
      sentences: c.sentences.map((s, i) => ({
        text: s.text, firstWord: s.firstWord, lastWord: s.lastWord, startMs: w[s.firstWord].start, endMs: w[s.lastWord].end, part: parts?.[i] ?? null,
      })),
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

  let story: AttemptView["story"] = null;
  if (attempt.status === "ready" && sessionId) {
    const saved = attempt.storyId ? await repo.stories.findForSession(attempt.storyId, sessionId) : null;
    if (saved) {
      story = { saved: { id: saved.id, name: storyName(saved), missing: saved.format === "star" ? missingParts(saved) : [] }, similar: null, canSave: false };
    } else {
      const similar = await findSimilarStory(repo, sessionId, attempt);
      story = { saved: null, similar: similar ? { id: similar.id, name: storyName(similar) } : null, canSave: Boolean(star) };
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
    star,
    story,
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
