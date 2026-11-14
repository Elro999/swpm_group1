import { randomUUID } from "node:crypto";
import type {
  AiCallRow,
  AttemptRow,
  CompetencyMapRow,
  CompetencyRow,
  EventRow,
  FeedbackMetricsRow,
  FeedbackPointRow,
  InterviewRow,
  PointRatingRow,
  QuestionRow,
  Repo,
  SessionRow,
  StoryRow,
} from "./types";

/**
 * In-process store (DATA_MODE=memory). Data is lost on restart and is per server instance,
 * which is why env.ts refuses this mode on Vercel. Rows are copied on the way in and out so
 * callers can never mutate stored state by accident. Deletes cascade like the SQL schema does.
 */
interface Store {
  sessions: Map<string, SessionRow>;
  interviews: Map<string, InterviewRow>;
  competencies: Map<string, CompetencyRow>;
  questions: Map<string, QuestionRow>;
  attempts: Map<string, AttemptRow>;
  points: Map<string, FeedbackPointRow>;
  metrics: Map<string, FeedbackMetricsRow>;
  ratings: Map<string, PointRatingRow>;
  stories: Map<string, StoryRow>;
  competencyMap: Map<string, CompetencyMapRow>; // keyed by competencyId
  events: EventRow[];
  aiCalls: (AiCallRow & { id: string })[];
  leases: Map<string, number>; // attemptId → processing_until (epoch ms)
  rateLimits: Map<string, { windowStart: number; hits: number }>;
}

const clone = <T>(v: T): T => structuredClone(v);
const byOrd = (a: { ord: number }, b: { ord: number }) => a.ord - b.ord;

export function createMemoryRepo(): Repo {
  const s: Store = {
    sessions: new Map(),
    interviews: new Map(),
    competencies: new Map(),
    questions: new Map(),
    attempts: new Map(),
    points: new Map(),
    metrics: new Map(),
    ratings: new Map(),
    stories: new Map(),
    competencyMap: new Map(),
    events: [],
    aiCalls: [],
    leases: new Map(),
    rateLimits: new Map(),
  };

  function deleteFeedback(attemptId: string) {
    s.metrics.delete(attemptId);
    for (const [k, p] of s.points) {
      if (p.attemptId !== attemptId) continue;
      s.points.delete(k);
      s.ratings.delete(k);
    }
  }

  function deleteInterview(id: string) {
    s.interviews.delete(id);
    for (const [k, c] of s.competencies) {
      if (c.interviewId !== id) continue;
      s.competencies.delete(k);
      s.competencyMap.delete(k);
    }
    for (const [k, q] of s.questions) {
      if (q.interviewId !== id) continue;
      s.questions.delete(k);
      for (const [ak, a] of s.attempts) {
        if (a.questionId !== k) continue;
        s.attempts.delete(ak);
        deleteFeedback(ak);
      }
    }
  }

  return {
    kind: "memory",
    stories: {
      async create(input) {
        const now = new Date();
        const row: StoryRow = { ...clone(input), id: randomUUID(), createdAt: now, updatedAt: now };
        s.stories.set(row.id, row);
        return clone(row);
      },
      async findForSession(id, sessionId) {
        const row = s.stories.get(id);
        return row && row.sessionId === sessionId ? clone(row) : null;
      },
      async listBySession(sessionId) {
        return [...s.stories.values()]
          .filter((r) => r.sessionId === sessionId)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map(clone);
      },
      async update(id, patch) {
        const row = s.stories.get(id);
        if (!row) throw new Error("story not found");
        Object.assign(row, clone(patch), { updatedAt: new Date() });
        return clone(row);
      },
    },
    competencyMap: {
      async replace(competencyIds, rows) {
        for (const id of competencyIds) s.competencyMap.delete(id);
        for (const r of rows) {
          if (!r.isGap && !r.storyId) throw new Error("competency_map: story or gap required"); // mirrors the SQL check
          s.competencyMap.set(r.competencyId, clone(r));
        }
      },
      async listByCompetencies(ids) {
        return ids.flatMap((id) => (s.competencyMap.has(id) ? [clone(s.competencyMap.get(id)!)] : []));
      },
      async invalidateStory(storyId) {
        for (const [k, m] of s.competencyMap) {
          if (m.storyId === storyId) s.competencyMap.set(k, { competencyId: k, storyId: null, isGap: true, rationaleQuote: null });
        }
      },
    },
    attempts: {
      async create({ questionId, attemptNo }) {
        if ([...s.attempts.values()].some((a) => a.questionId === questionId && a.attemptNo === attemptNo)) {
          throw new Error("attempt already exists for this question and number"); // mirrors the SQL unique constraint
        }
        const row: AttemptRow = {
          id: randomUUID(), questionId, attemptNo, status: "created",
          answerAudioKey: null, answerAudioMime: null, answerWords: null, answerText: null, answerDurationMs: null,
          followupText: null, followupQuote: null, followupSkipped: false,
          followupAudioKey: null, followupAudioMime: null, followupWords: null, error: null, createdAt: new Date(),
        };
        s.attempts.set(row.id, row);
        return clone(row);
      },
      async findById(id) {
        const row = s.attempts.get(id);
        return row ? clone(row) : null;
      },
      async listByQuestion(questionId) {
        return [...s.attempts.values()].filter((a) => a.questionId === questionId).sort((a, b) => a.attemptNo - b.attemptNo).map(clone);
      },
      async update(id, patch) {
        const row = s.attempts.get(id);
        if (!row) throw new Error("attempt not found");
        Object.assign(row, clone(patch));
        return clone(row);
      },
      async claim(id, until, now) {
        // No await between the check and the write, so this is atomic within the process.
        const row = s.attempts.get(id);
        if (!row) return null;
        const held = s.leases.get(id);
        if (held !== undefined && held > now.getTime()) return null;
        s.leases.set(id, until.getTime());
        return clone(row);
      },
      async release(id) {
        s.leases.delete(id);
      },
      async clearAudioKeys(keys) {
        const set = new Set(keys);
        for (const a of s.attempts.values()) {
          if (a.answerAudioKey && set.has(a.answerAudioKey)) a.answerAudioKey = null;
          if (a.followupAudioKey && set.has(a.followupAudioKey)) a.followupAudioKey = null;
        }
      },
    },
    feedback: {
      async save(attemptId, metrics, points) {
        deleteFeedback(attemptId);
        s.metrics.set(attemptId, { ...clone(metrics), attemptId });
        const saved = points.map((p) => {
          const row: FeedbackPointRow = { ...clone(p), id: randomUUID(), attemptId };
          s.points.set(row.id, row);
          return clone(row);
        });
        const attempt = s.attempts.get(attemptId);
        if (attempt) Object.assign(attempt, { status: "ready", error: null });
        return saved.sort((a, b) => a.quoteStartMs - b.quoteStartMs);
      },
      async get(attemptId) {
        const metrics = s.metrics.get(attemptId);
        const points = [...s.points.values()].filter((p) => p.attemptId === attemptId).sort((a, b) => a.quoteStartMs - b.quoteStartMs);
        return { metrics: metrics ? clone(metrics) : null, points: points.map(clone) };
      },
      async findPoint(pointId) {
        const row = s.points.get(pointId);
        return row ? clone(row) : null;
      },
    },
    pointRatings: {
      async set(pointId, { notUseful, reason }) {
        s.ratings.set(pointId, { feedbackPointId: pointId, notUseful, reason, createdAt: new Date() });
      },
      async listByPoints(ids) {
        return ids.flatMap((id) => (s.ratings.has(id) ? [clone(s.ratings.get(id)!)] : []));
      },
    },
    interviews: {
      async create(input) {
        const row: InterviewRow = { ...clone(input), id: randomUUID(), createdAt: new Date() };
        s.interviews.set(row.id, row);
        return clone(row);
      },
      async findForSession(id, sessionId) {
        const row = s.interviews.get(id);
        return row && row.sessionId === sessionId ? clone(row) : null;
      },
      async listBySession(sessionId) {
        return [...s.interviews.values()]
          .filter((r) => r.sessionId === sessionId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(clone);
      },
      async delete(id) {
        deleteInterview(id);
      },
      async setCv(id, cvText) {
        const row = s.interviews.get(id);
        if (!row) throw new Error("interview not found");
        row.cvText = cvText;
        return clone(row);
      },
    },
    competencies: {
      async insertMany(interviewId, rows) {
        return rows.map((r) => {
          const row: CompetencyRow = { ...clone(r), id: randomUUID(), interviewId };
          s.competencies.set(row.id, row);
          return clone(row);
        });
      },
      async listByInterview(interviewId) {
        return [...s.competencies.values()].filter((c) => c.interviewId === interviewId).sort(byOrd).map(clone);
      },
      async findById(id) {
        const row = s.competencies.get(id);
        return row ? clone(row) : null;
      },
    },
    questions: {
      async insertMany(interviewId, rows) {
        return rows.map((r) => {
          const row: QuestionRow = { ...clone(r), id: randomUUID(), interviewId };
          s.questions.set(row.id, row);
          return clone(row);
        });
      },
      async listByInterview(interviewId) {
        return [...s.questions.values()].filter((q) => q.interviewId === interviewId).sort(byOrd).map(clone);
      },
      async findById(id) {
        const row = s.questions.get(id);
        return row ? clone(row) : null;
      },
    },
    sessions: {
      async create(tokenHash) {
        const now = new Date();
        const row: SessionRow = { id: randomUUID(), tokenHash, createdAt: now, lastSeenAt: now, consentAt: null };
        s.sessions.set(row.id, row);
        return clone(row);
      },
      async findByTokenHash(tokenHash) {
        for (const row of s.sessions.values()) if (row.tokenHash === tokenHash) return clone(row);
        return null;
      },
      async touch(id, at) {
        const row = s.sessions.get(id);
        if (row) row.lastSeenAt = new Date(at);
      },
      async setConsent(id, at) {
        const row = s.sessions.get(id);
        if (row) row.consentAt = new Date(at);
      },
      async findById(id) {
        const row = s.sessions.get(id);
        return row ? clone(row) : null;
      },
      async list(limit) {
        return [...s.sessions.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit).map(clone);
      },
      async delete(id) {
        s.sessions.delete(id);
        for (const iv of [...s.interviews.values()]) if (iv.sessionId === id) deleteInterview(iv.id);
        for (const [k, st] of s.stories) {
          if (st.sessionId !== id) continue;
          s.stories.delete(k);
          for (const [ck, m] of s.competencyMap) if (m.storyId === k) s.competencyMap.delete(ck); // 0003: cascade
        }
        s.events = s.events.filter((e) => e.sessionId !== id);
        // 0004: ai_calls keep counting toward the deployment-wide cap but are unlinked from the deleted session.
        for (const c of s.aiCalls) if (c.sessionId === id) c.sessionId = null;
      },
    },
    events: {
      async insert(row) {
        s.events.push(clone(row));
      },
      async list(filter = {}) {
        return s.events
          .filter((e) => (filter.sessionId ? e.sessionId === filter.sessionId : true))
          .filter((e) => (filter.name ? e.name === filter.name : true))
          .map(clone);
      },
    },
    aiCalls: {
      async insert(row) {
        s.aiCalls.push({ ...clone(row), id: randomUUID() });
      },
      async list(filter = {}) {
        return s.aiCalls
          .filter((c) => (filter.sessionId ? c.sessionId === filter.sessionId : true))
          .map(({ id: _id, ...row }) => {
            void _id;
            return clone(row);
          });
      },
      async reserve({ sessionId, purpose, provider, sessionLimit, globalLimit, since }) {
        // Synchronous check-and-insert: atomic within the process, like the SQL advisory lock.
        const recent = s.aiCalls.filter((c) => c.at.getTime() >= since.getTime());
        if (recent.length >= globalLimit) return { denied: "global" };
        if (sessionId && recent.filter((c) => c.sessionId === sessionId).length >= sessionLimit) return { denied: "session" };
        const id = randomUUID();
        s.aiCalls.push({ id, sessionId, purpose, provider, model: "pending", latencyMs: 0, status: "pending", at: new Date() });
        return { id };
      },
      async complete(id, outcome) {
        const row = s.aiCalls.find((c) => c.id === id);
        if (row) Object.assign(row, clone(outcome));
      },
    },
    rateLimits: {
      async hit(key, windowMs, max) {
        const now = Date.now();
        const cur = s.rateLimits.get(key);
        const next = !cur || cur.windowStart <= now - windowMs ? { windowStart: now, hits: 1 } : { ...cur, hits: cur.hits + 1 };
        s.rateLimits.set(key, next);
        return next.hits <= max;
      },
    },
  };
}

// One shared instance per server process. Stored on globalThis so Next.js dev hot-reload keeps the data.
const g = globalThis as typeof globalThis & { __ipcMemoryRepo?: Repo };
export function sharedMemoryRepo(): Repo {
  g.__ipcMemoryRepo ??= createMemoryRepo();
  return g.__ipcMemoryRepo;
}
