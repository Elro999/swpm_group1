/**
 * Repository contract. Every data access in the app goes through a `Repo`, so the store can be
 * swapped (DATA_MODE=memory for dev/tests/demos, DATA_MODE=supabase for real users) without
 * touching feature code. Tables mirror supabase/migrations/*.sql; field names are camelCase here.
 *
 * Phase 0 covers sessions, events and ai_calls. Later phases ADD sub-repos (interviews, attempts,
 * stories, …) to this interface and implement them in BOTH memory.ts and supabase.ts.
 */

export interface SessionRow {
  id: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  consentAt: Date | null;
}

/** Event props: small primitives only. Enforced by modules/events (never user text). */
export type EventProps = Record<string, string | number | boolean | null>;

export interface EventRow {
  sessionId: string | null;
  name: string;
  props: EventProps;
  at: Date;
}

export interface AiCallRow {
  sessionId: string | null;
  purpose: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  audioMs?: number | null;
  /** "pending" = capacity reserved before the provider call (atomic quota, see modules/ai/log.ts). */
  status: "pending" | "ok" | "error";
  at: Date;
}

/** Result of an atomic quota reservation: a row id to complete later, or which limit was hit. */
export type AiReservation = { id: string } | { denied: "session" | "global" };

// ---------- Phase 1: interviews, competencies, questions ----------

export interface InterviewRow {
  id: string;
  sessionId: string;
  jdText: string;
  cvText: string | null;
  /** ISO date YYYY-MM-DD, or null when the user did not give one. */
  interviewDate: string | null;
  createdAt: Date;
}
export type NewInterview = Omit<InterviewRow, "id" | "createdAt">;

export interface CompetencyRow {
  id: string;
  interviewId: string;
  label: string;
  /** Verbatim slice of the JD: jdText.slice(jdQuoteStart, jdQuoteEnd). */
  jdQuote: string;
  jdQuoteStart: number;
  jdQuoteEnd: number;
  ord: number;
}
export type NewCompetency = Omit<CompetencyRow, "id" | "interviewId">;

export interface QuestionRow {
  id: string;
  interviewId: string;
  competencyId: string | null;
  text: string;
  jdQuote: string;
  ord: number;
}
export type NewQuestion = Omit<QuestionRow, "id" | "interviewId">;

// ---------- Phase 2: attempts, feedback, ratings ----------

/** A word with timings in ms from the start of the recording (same shape as contracts.Word). */
export interface TimedWord {
  w: string;
  start: number;
  end: number;
}

/** State machine in doc 02 §4. "failed" keeps all stored data so the failed step can be retried. */
export type AttemptStatus =
  | "created"
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "followup_ready"
  | "followup_uploaded"
  | "followup_transcribed"
  | "analysing"
  | "ready"
  | "failed";

export interface AttemptRow {
  id: string;
  questionId: string;
  attemptNo: number;
  status: AttemptStatus;
  answerAudioKey: string | null;
  answerAudioMime: string | null;
  answerWords: TimedWord[] | null;
  answerText: string | null;
  answerDurationMs: number | null;
  followupText: string | null;
  followupQuote: string | null;
  followupSkipped: boolean;
  followupAudioKey: string | null;
  followupAudioMime: string | null;
  followupWords: TimedWord[] | null;
  /** Human-readable reason when status = "failed". Never contains user text. */
  error: string | null;
  createdAt: Date;
}
export type AttemptPatch = Partial<Omit<AttemptRow, "id" | "questionId" | "attemptNo" | "createdAt">>;

export type FeedbackKind = "delivery" | "fit";
export type FeedbackSeverity = "info" | "warn" | "fix";

export interface FeedbackPointRow {
  id: string;
  attemptId: string;
  checkId: string;
  kind: FeedbackKind;
  severity: FeedbackSeverity;
  message: string;
  /** Verbatim words from the user's answer (G2). */
  quote: string;
  quoteStartMs: number;
  quoteEndMs: number;
}
export type NewFeedbackPoint = Omit<FeedbackPointRow, "id" | "attemptId">;

export interface FeedbackMetricsRow {
  attemptId: string;
  timeToDecisionMs: number | null;
  iCount: number;
  weCount: number;
  durationMs: number;
  answeredQuestion: boolean | null;
  competencyShown: boolean | null;
}

// ---------- Phase 4: story bank and competency map ----------

export type StoryState = "draft" | "structured" | "ready";

/** A verbatim slice of the story's raw text: rawText.slice(start, end) === text. */
export interface StorySpan {
  text: string;
  start: number;
  end: number;
}

export type StoryActor = "own" | "team" | "unclear";
export type StoryFlag = "we" | "no_evidence";

export interface StorySentence {
  start: number;
  end: number;
  actor: StoryActor;
  flags: StoryFlag[];
}

export interface StoryRow {
  id: string;
  sessionId: string;
  rawText: string;
  source: "pasted" | "discovery";
  state: StoryState;
  situation: StorySpan | null;
  decision: StorySpan | null;
  result: StorySpan | null;
  sentences: StorySentence[];
  createdAt: Date;
  updatedAt: Date;
}
export type NewStory = Omit<StoryRow, "id" | "createdAt" | "updatedAt">;
export type StoryPatch = Partial<Omit<StoryRow, "id" | "sessionId" | "createdAt" | "updatedAt">>;

export interface CompetencyMapRow {
  competencyId: string;
  storyId: string | null;
  isGap: boolean;
  /** Verbatim words from the mapped story that show the competency (G2 for mappings). */
  rationaleQuote: string | null;
}

export interface PointRatingRow {
  feedbackPointId: string;
  notUseful: boolean;
  reason: string | null;
  createdAt: Date;
}

export interface Repo {
  readonly kind: "memory" | "supabase";
  interviews: {
    create(input: NewInterview): Promise<InterviewRow>;
    /** Only returns the interview if it belongs to this session (ownership check lives in the query). */
    findForSession(id: string, sessionId: string): Promise<InterviewRow | null>;
    listBySession(sessionId: string): Promise<InterviewRow[]>; // newest first
    delete(id: string): Promise<void>; // cascades to competencies and questions
    /** Phase 5: add or replace the CV text used for gap prompts (null clears it). */
    setCv(id: string, cvText: string | null): Promise<InterviewRow>;
  };
  competencies: {
    insertMany(interviewId: string, rows: NewCompetency[]): Promise<CompetencyRow[]>;
    listByInterview(interviewId: string): Promise<CompetencyRow[]>; // by ord
    /** Caller must check ownership via interviews.findForSession(row.interviewId, sessionId). */
    findById(id: string): Promise<CompetencyRow | null>;
  };
  questions: {
    insertMany(interviewId: string, rows: NewQuestion[]): Promise<QuestionRow[]>;
    listByInterview(interviewId: string): Promise<QuestionRow[]>; // by ord
    findById(id: string): Promise<QuestionRow | null>;
  };
  attempts: {
    create(input: { questionId: string; attemptNo: number }): Promise<AttemptRow>;
    findById(id: string): Promise<AttemptRow | null>;
    listByQuestion(questionId: string): Promise<AttemptRow[]>; // by attemptNo ascending
    update(id: string, patch: AttemptPatch): Promise<AttemptRow>;
    /**
     * Exclusive processing lease (review fix): atomically sets processing_until = until if the attempt is
     * not already leased (or the lease expired before `now`). Returns null when someone else holds it.
     */
    claim(id: string, until: Date, now: Date): Promise<AttemptRow | null>;
    release(id: string): Promise<void>;
    /** Retention: forget audio keys whose objects were deleted (answer or follow-up). */
    clearAudioKeys(keys: string[]): Promise<void>;
  };
  feedback: {
    /**
     * Replaces any previous feedback for the attempt AND marks the attempt ready, in one transaction
     * (Supabase: the save_feedback function), so readers never see half-written feedback.
     */
    save(attemptId: string, metrics: Omit<FeedbackMetricsRow, "attemptId">, points: NewFeedbackPoint[]): Promise<FeedbackPointRow[]>;
    get(attemptId: string): Promise<{ metrics: FeedbackMetricsRow | null; points: FeedbackPointRow[] }>;
    findPoint(pointId: string): Promise<FeedbackPointRow | null>;
  };
  pointRatings: {
    set(pointId: string, rating: { notUseful: boolean; reason: string | null }): Promise<void>;
    listByPoints(pointIds: string[]): Promise<PointRatingRow[]>;
  };
  stories: {
    create(input: NewStory): Promise<StoryRow>;
    /** Ownership enforced in the query, like interviews.findForSession. */
    findForSession(id: string, sessionId: string): Promise<StoryRow | null>;
    listBySession(sessionId: string): Promise<StoryRow[]>; // oldest first
    update(id: string, patch: StoryPatch): Promise<StoryRow>;
  };
  competencyMap: {
    /** Replace all mapping rows for these competencies (one interview's set) in one go. */
    replace(competencyIds: string[], rows: CompetencyMapRow[]): Promise<void>;
    listByCompetencies(competencyIds: string[]): Promise<CompetencyMapRow[]>;
    /** A story's text changed: every mapping that relied on it becomes a gap until mapping runs again. */
    invalidateStory(storyId: string): Promise<void>;
  };
  sessions: {
    create(tokenHash: string): Promise<SessionRow>;
    findByTokenHash(tokenHash: string): Promise<SessionRow | null>;
    touch(id: string, at: Date): Promise<void>;
    setConsent(id: string, at: Date): Promise<void>;
    /** Hard delete; cascades to every row owned by the session (PF2). */
    delete(id: string): Promise<void>;
    /** Admin only (Phase 6): one session by id, and recent sessions newest first. */
    findById(id: string): Promise<SessionRow | null>;
    list(limit: number): Promise<SessionRow[]>;
  };
  events: {
    insert(row: EventRow): Promise<void>;
    list(filter?: { sessionId?: string; name?: string }): Promise<EventRow[]>;
  };
  aiCalls: {
    insert(row: AiCallRow): Promise<void>;
    list(filter?: { sessionId?: string }): Promise<AiCallRow[]>;
    /**
     * Atomically check the per-session and deployment-wide limits over calls at or after `since`
     * (pending ones included) and, if both allow it, insert a pending row. Serialised in the database,
     * so concurrent requests cannot both take the last slot.
     */
    reserve(input: { sessionId: string | null; purpose: string; provider: string; sessionLimit: number; globalLimit: number; since: Date }): Promise<AiReservation>;
    complete(id: string, outcome: Pick<AiCallRow, "model" | "latencyMs" | "inputTokens" | "outputTokens" | "audioMs" | "status">): Promise<void>;
  };
  rateLimits: {
    /** Atomic fixed-window counter: records one hit for `key` and returns false once `max` is exceeded. */
    hit(key: string, windowMs: number, max: number): Promise<boolean>;
  };
}
