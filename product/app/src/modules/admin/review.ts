import type { Repo, SessionRow, StoryRow } from "@/lib/db/types";
import { buildCanonical } from "@/modules/feedback/transcript";
import { computeMetrics, type MetricRow } from "./metrics";

/**
 * Read-only data for the teammate review page (PF4) and the metrics page (PF5).
 * Reviewers see users' own transcripts and feedback, which the consent notice discloses.
 * Never call these from anything a normal visitor can reach: routes and pages must check admin first.
 */
const MAX_SESSIONS = 500;

export interface SessionSummary {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  consented: boolean;
  interviews: number;
  attempts: number;
  feedbackPoints: number;
  notUseful: number;
  stories: number;
}

export interface ReviewPoint {
  checkId: string;
  kind: string;
  severity: string;
  message: string;
  quote: string;
  startMs: number;
  notUseful: boolean;
  reason: string | null;
}

export interface ReviewAttempt {
  attemptNo: number;
  status: string;
  transcript: string | null;
  followup: { question: string; skipped: boolean; transcript: string | null } | null;
  points: ReviewPoint[];
}

export interface SessionReview {
  session: SessionRow;
  interviews: {
    id: string;
    jdFirstLine: string;
    interviewDate: string | null;
    questions: { text: string; attempts: ReviewAttempt[] }[];
  }[];
  stories: Pick<StoryRow, "id" | "state" | "source" | "rawText" | "decision">[];
}

async function attemptsFor(repo: Repo, interviewId: string) {
  const questions = await repo.questions.listByInterview(interviewId);
  return Promise.all(
    questions.map(async (q) => {
      const attempts = await repo.attempts.listByQuestion(q.id);
      const detailed: ReviewAttempt[] = await Promise.all(
        attempts.map(async (a) => {
          const fb = await repo.feedback.get(a.id);
          const ratings = await repo.pointRatings.listByPoints(fb.points.map((p) => p.id));
          const byPoint = new Map(ratings.map((r) => [r.feedbackPointId, r]));
          return {
            attemptNo: a.attemptNo,
            status: a.status,
            transcript: a.answerWords ? buildCanonical(a.answerWords).text : null,
            followup: a.followupText
              ? { question: a.followupText, skipped: a.followupSkipped, transcript: a.followupWords ? buildCanonical(a.followupWords).text : null }
              : null,
            points: fb.points.map((p) => ({
              checkId: p.checkId,
              kind: p.kind,
              severity: p.severity,
              message: p.message,
              quote: p.quote,
              startMs: p.quoteStartMs,
              notUseful: byPoint.get(p.id)?.notUseful ?? false,
              reason: byPoint.get(p.id)?.reason ?? null,
            })),
          };
        }),
      );
      return { text: q.text, attempts: detailed };
    }),
  );
}

export async function buildSessionReview(repo: Repo, sessionId: string): Promise<SessionReview | null> {
  const session = await repo.sessions.findById(sessionId);
  if (!session) return null;
  const interviews = await repo.interviews.listBySession(sessionId);
  return {
    session,
    interviews: await Promise.all(
      interviews.map(async (iv) => ({
        id: iv.id,
        jdFirstLine: iv.jdText.split("\n").find((l) => l.trim())?.trim().slice(0, 120) ?? "",
        interviewDate: iv.interviewDate,
        questions: await attemptsFor(repo, iv.id),
      })),
    ),
    stories: (await repo.stories.listBySession(sessionId)).map(({ id, state, source, rawText, decision }) => ({ id, state, source, rawText, decision })),
  };
}

/** Session list for the review queue, plus the hypothesis metrics, in one pass over the data. */
export async function buildAdminOverview(repo: Repo, now = new Date()): Promise<{ sessions: SessionSummary[]; metrics: MetricRow[] }> {
  const sessions = await repo.sessions.list(MAX_SESSIONS);
  const events = await repo.events.list();
  const allStories: { state: StoryRow["state"] }[] = [];
  let points = 0;
  let notUseful = 0;

  const summaries: SessionSummary[] = [];
  for (const s of sessions) {
    const interviews = await repo.interviews.listBySession(s.id);
    const stories = await repo.stories.listBySession(s.id);
    allStories.push(...stories);
    let attempts = 0;
    let sPoints = 0;
    let sNotUseful = 0;
    for (const iv of interviews) {
      for (const q of await attemptsFor(repo, iv.id)) {
        attempts += q.attempts.length;
        for (const a of q.attempts) {
          sPoints += a.points.length;
          sNotUseful += a.points.filter((p) => p.notUseful).length;
        }
      }
    }
    points += sPoints;
    notUseful += sNotUseful;
    summaries.push({
      id: s.id,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      consented: Boolean(s.consentAt),
      interviews: interviews.length,
      attempts,
      feedbackPoints: sPoints,
      notUseful: sNotUseful,
      stories: stories.length,
    });
  }

  return {
    sessions: summaries,
    metrics: computeMetrics({ sessions, events, stories: allStories, feedbackPoints: points, notUsefulPoints: notUseful, now }),
  };
}
