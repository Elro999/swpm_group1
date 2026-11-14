import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AiCallRow,
  AttemptPatch,
  AttemptRow,
  CompetencyMapRow,
  CompetencyRow,
  EventRow,
  FeedbackMetricsRow,
  FeedbackPointRow,
  InterviewRow,
  QuestionRow,
  Repo,
  SessionRow,
  StoryPatch,
  StoryRow,
  StorySentence,
  StorySpan,
  TimedWord,
} from "./types";

type SpanPair = [number, number] | null;

/** DB layout: situation/decision/result hold the text; spans jsonb holds the offsets. */
function toStory(r: Record<string, unknown>): StoryRow {
  const spans = (r.spans ?? {}) as Record<string, SpanPair>;
  const span = (field: "situation" | "decision" | "result"): StorySpan | null => {
    const text = r[field] as string | null;
    const pair = spans[field];
    return text && pair ? { text, start: pair[0], end: pair[1] } : null;
  };
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    rawText: r.raw_text as string,
    source: r.source as StoryRow["source"],
    state: r.state as StoryRow["state"],
    situation: span("situation"),
    decision: span("decision"),
    result: span("result"),
    sentences: (r.sentences as StorySentence[]) ?? [],
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  };
}

function storyColumns(p: StoryPatch, current?: StoryRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.rawText !== undefined) out.raw_text = p.rawText;
  if (p.source !== undefined) out.source = p.source;
  if (p.state !== undefined) out.state = p.state;
  if (p.sentences !== undefined) out.sentences = p.sentences;
  const fields = ["situation", "decision", "result"] as const;
  if (fields.some((f) => p[f] !== undefined)) {
    const merged = Object.fromEntries(fields.map((f) => [f, p[f] !== undefined ? p[f] : current?.[f] ?? null])) as Record<string, StorySpan | null>;
    for (const f of fields) out[f] = merged[f]?.text ?? null;
    out.spans = Object.fromEntries(fields.map((f) => [f, merged[f] ? [merged[f]!.start, merged[f]!.end] : null]));
  }
  return out;
}

/**
 * Supabase-backed repo (DATA_MODE=supabase). Server-only: uses the service-role key, which
 * bypasses RLS. The browser never receives this client or the key.
 * Column names are snake_case (see supabase/migrations/0001_init.sql); this file maps them.
 *
 * Verified against the live project on 2026-11-14 (smoke test in product/log.md). Steps that must be
 * atomic (quota reservation, rate limits, saving feedback) call SQL functions from migration 0004.
 */

type SessionDb = { id: string; token_hash: string; created_at: string; last_seen_at: string; consent_at: string | null };

const toSession = (r: SessionDb): SessionRow => ({
  id: r.id,
  tokenHash: r.token_hash,
  createdAt: new Date(r.created_at),
  lastSeenAt: new Date(r.last_seen_at),
  consentAt: r.consent_at ? new Date(r.consent_at) : null,
});

type Db = Record<string, unknown>;

const toInterview = (r: Db): InterviewRow => ({
  id: r.id as string,
  sessionId: r.session_id as string,
  jdText: r.jd_text as string,
  cvText: (r.cv_text as string | null) ?? null,
  interviewDate: (r.interview_date as string | null) ?? null,
  createdAt: new Date(r.created_at as string),
});

const toCompetency = (r: Db): CompetencyRow => ({
  id: r.id as string,
  interviewId: r.interview_id as string,
  label: r.label as string,
  jdQuote: r.jd_quote as string,
  jdQuoteStart: r.jd_quote_start as number,
  jdQuoteEnd: r.jd_quote_end as number,
  ord: r.ord as number,
});

const toQuestion = (r: Db): QuestionRow => ({
  id: r.id as string,
  interviewId: r.interview_id as string,
  competencyId: (r.competency_id as string | null) ?? null,
  text: r.text as string,
  jdQuote: r.jd_quote as string,
  ord: r.ord as number,
});

const toAttempt = (r: Db): AttemptRow => ({
  id: r.id as string,
  questionId: r.question_id as string,
  attemptNo: r.attempt_no as number,
  status: r.status as AttemptRow["status"],
  answerAudioKey: (r.answer_audio_key as string | null) ?? null,
  answerAudioMime: (r.answer_audio_mime as string | null) ?? null,
  answerWords: (r.answer_words as TimedWord[] | null) ?? null,
  answerText: (r.answer_text as string | null) ?? null,
  answerDurationMs: (r.answer_duration_ms as number | null) ?? null,
  followupText: (r.followup_text as string | null) ?? null,
  followupQuote: (r.followup_quote as string | null) ?? null,
  followupSkipped: Boolean(r.followup_skipped),
  followupAudioKey: (r.followup_audio_key as string | null) ?? null,
  followupAudioMime: (r.followup_audio_mime as string | null) ?? null,
  followupWords: (r.followup_words as TimedWord[] | null) ?? null,
  error: (r.error as string | null) ?? null,
  createdAt: new Date(r.created_at as string),
});

const ATTEMPT_COLUMNS: Record<keyof AttemptPatch, string> = {
  status: "status",
  answerAudioKey: "answer_audio_key",
  answerAudioMime: "answer_audio_mime",
  answerWords: "answer_words",
  answerText: "answer_text",
  answerDurationMs: "answer_duration_ms",
  followupText: "followup_text",
  followupQuote: "followup_quote",
  followupSkipped: "followup_skipped",
  followupAudioKey: "followup_audio_key",
  followupAudioMime: "followup_audio_mime",
  followupWords: "followup_words",
  error: "error",
};

const toPoint = (r: Db): FeedbackPointRow => ({
  id: r.id as string,
  attemptId: r.attempt_id as string,
  checkId: r.check_id as string,
  kind: r.kind as FeedbackPointRow["kind"],
  severity: r.severity as FeedbackPointRow["severity"],
  message: r.message as string,
  quote: r.quote as string,
  quoteStartMs: r.quote_start_ms as number,
  quoteEndMs: r.quote_end_ms as number,
});

const toMetrics = (r: Db): FeedbackMetricsRow => ({
  attemptId: r.attempt_id as string,
  timeToDecisionMs: (r.time_to_decision_ms as number | null) ?? null,
  iCount: r.i_count as number,
  weCount: r.we_count as number,
  durationMs: r.duration_ms as number,
  answeredQuestion: (r.answered_question as boolean | null) ?? null,
  competencyShown: (r.competency_shown as boolean | null) ?? null,
});

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  // Surface failures loudly; never continue with a half-written state. No row content in the message.
  if (res.error) throw new Error(`Supabase ${what} failed: ${res.error.message}`);
  return res.data;
}

export function createSupabaseRepo(url: string, serviceRoleKey: string): Repo {
  const db: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    kind: "supabase",
    stories: {
      async create(input) {
        const data = check(
          await db
            .from("stories")
            .insert({ session_id: input.sessionId, ...storyColumns(input) })
            .select()
            .single(),
          "stories.create",
        );
        return toStory(data as Db);
      },
      async findForSession(id, sessionId) {
        const data = check(await db.from("stories").select().eq("id", id).eq("session_id", sessionId).maybeSingle(), "stories.findForSession");
        return data ? toStory(data as Db) : null;
      },
      async listBySession(sessionId) {
        const data = check(await db.from("stories").select().eq("session_id", sessionId).order("created_at"), "stories.listBySession");
        return (data as Db[]).map(toStory);
      },
      async update(id, patch) {
        const current = check(await db.from("stories").select().eq("id", id).single(), "stories.update(read)");
        const data = check(
          await db
            .from("stories")
            .update({ ...storyColumns(patch, toStory(current as Db)), updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single(),
          "stories.update",
        );
        return toStory(data as Db);
      },
    },
    competencyMap: {
      async replace(competencyIds, rows) {
        if (competencyIds.length) check(await db.from("competency_map").delete().in("competency_id", competencyIds), "competencyMap.replace(delete)");
        if (!rows.length) return;
        check(
          await db.from("competency_map").insert(
            rows.map((r: CompetencyMapRow) => ({ competency_id: r.competencyId, story_id: r.storyId, is_gap: r.isGap, rationale_quote: r.rationaleQuote })),
          ),
          "competencyMap.replace(insert)",
        );
      },
      async listByCompetencies(ids) {
        if (!ids.length) return [];
        const data = check(await db.from("competency_map").select().in("competency_id", ids), "competencyMap.listByCompetencies");
        return (data as Db[]).map((r) => ({
          competencyId: r.competency_id as string,
          storyId: (r.story_id as string | null) ?? null,
          isGap: Boolean(r.is_gap),
          rationaleQuote: (r.rationale_quote as string | null) ?? null,
        }));
      },
      async invalidateStory(storyId) {
        check(
          await db.from("competency_map").update({ story_id: null, is_gap: true, rationale_quote: null }).eq("story_id", storyId),
          "competencyMap.invalidateStory",
        );
      },
    },
    attempts: {
      async create({ questionId, attemptNo }) {
        const data = check(await db.from("attempts").insert({ question_id: questionId, attempt_no: attemptNo }).select().single(), "attempts.create");
        return toAttempt(data as Db);
      },
      async findById(id) {
        const data = check(await db.from("attempts").select().eq("id", id).maybeSingle(), "attempts.findById");
        return data ? toAttempt(data as Db) : null;
      },
      async listByQuestion(questionId) {
        const data = check(await db.from("attempts").select().eq("question_id", questionId).order("attempt_no"), "attempts.listByQuestion");
        return (data as Db[]).map(toAttempt);
      },
      async update(id, patch) {
        const row: Db = { updated_at: new Date().toISOString() };
        for (const [k, v] of Object.entries(patch)) row[ATTEMPT_COLUMNS[k as keyof AttemptPatch]] = v;
        const data = check(await db.from("attempts").update(row).eq("id", id).select().single(), "attempts.update");
        return toAttempt(data as Db);
      },
      async claim(id, until, now) {
        // One UPDATE with the lease condition in its WHERE clause: atomic in Postgres.
        const data = check(
          await db
            .from("attempts")
            .update({ processing_until: until.toISOString() })
            .eq("id", id)
            .or(`processing_until.is.null,processing_until.lt.${now.toISOString()}`)
            .select()
            .maybeSingle(),
          "attempts.claim",
        );
        return data ? toAttempt(data as Db) : null;
      },
      async release(id) {
        check(await db.from("attempts").update({ processing_until: null }).eq("id", id), "attempts.release");
      },
      async clearAudioKeys(keys) {
        if (!keys.length) return;
        check(await db.from("attempts").update({ answer_audio_key: null }).in("answer_audio_key", keys), "attempts.clearAudioKeys(answer)");
        check(await db.from("attempts").update({ followup_audio_key: null }).in("followup_audio_key", keys), "attempts.clearAudioKeys(followup)");
      },
    },
    feedback: {
      async save(attemptId, metrics, points) {
        // One transaction (save_feedback in 0004): replace points + metrics and mark the attempt ready.
        const data = check(
          await db.rpc("save_feedback", {
            p_attempt: attemptId,
            p_metrics: {
              time_to_decision_ms: metrics.timeToDecisionMs, i_count: metrics.iCount, we_count: metrics.weCount,
              duration_ms: metrics.durationMs, answered_question: metrics.answeredQuestion, competency_shown: metrics.competencyShown,
            },
            p_points: points.map((p) => ({
              check_id: p.checkId, kind: p.kind, severity: p.severity, message: p.message,
              quote: p.quote, quote_start_ms: p.quoteStartMs, quote_end_ms: p.quoteEndMs,
            })),
          }),
          "feedback.save",
        );
        return ((data ?? []) as Db[]).map(toPoint).sort((a, b) => a.quoteStartMs - b.quoteStartMs);
      },
      async get(attemptId) {
        const [m, p] = await Promise.all([
          db.from("feedback_metrics").select().eq("attempt_id", attemptId).maybeSingle(),
          db.from("feedback_points").select().eq("attempt_id", attemptId).order("quote_start_ms"),
        ]);
        const metrics = check(m, "feedback.get(metrics)");
        const points = check(p, "feedback.get(points)");
        return { metrics: metrics ? toMetrics(metrics as Db) : null, points: (points as Db[]).map(toPoint) };
      },
      async findPoint(pointId) {
        const data = check(await db.from("feedback_points").select().eq("id", pointId).maybeSingle(), "feedback.findPoint");
        return data ? toPoint(data as Db) : null;
      },
    },
    pointRatings: {
      async set(pointId, { notUseful, reason }) {
        check(await db.from("point_ratings").upsert({ feedback_point_id: pointId, not_useful: notUseful, reason }), "pointRatings.set");
      },
      async listByPoints(ids) {
        if (!ids.length) return [];
        const data = check(await db.from("point_ratings").select().in("feedback_point_id", ids), "pointRatings.listByPoints");
        return (data as Db[]).map((r) => ({
          feedbackPointId: r.feedback_point_id as string, notUseful: r.not_useful as boolean,
          reason: (r.reason as string | null) ?? null, createdAt: new Date(r.created_at as string),
        }));
      },
    },
    interviews: {
      async create(input) {
        const data = check(
          await db
            .from("interviews")
            .insert({ session_id: input.sessionId, jd_text: input.jdText, cv_text: input.cvText, interview_date: input.interviewDate })
            .select()
            .single(),
          "interviews.create",
        );
        return toInterview(data as Db);
      },
      async findForSession(id, sessionId) {
        const data = check(await db.from("interviews").select().eq("id", id).eq("session_id", sessionId).maybeSingle(), "interviews.findForSession");
        return data ? toInterview(data as Db) : null;
      },
      async listBySession(sessionId) {
        const data = check(await db.from("interviews").select().eq("session_id", sessionId).order("created_at", { ascending: false }), "interviews.listBySession");
        return (data as Db[]).map(toInterview);
      },
      async delete(id) {
        check(await db.from("interviews").delete().eq("id", id), "interviews.delete");
      },
      async setCv(id, cvText) {
        const data = check(await db.from("interviews").update({ cv_text: cvText }).eq("id", id).select().single(), "interviews.setCv");
        return toInterview(data as Db);
      },
    },
    competencies: {
      async insertMany(interviewId, rows) {
        if (!rows.length) return [];
        const data = check(
          await db
            .from("competencies")
            .insert(rows.map((r) => ({ interview_id: interviewId, label: r.label, jd_quote: r.jdQuote, jd_quote_start: r.jdQuoteStart, jd_quote_end: r.jdQuoteEnd, ord: r.ord })))
            .select(),
          "competencies.insertMany",
        );
        return (data as Db[]).map(toCompetency).sort((a, b) => a.ord - b.ord);
      },
      async listByInterview(interviewId) {
        const data = check(await db.from("competencies").select().eq("interview_id", interviewId).order("ord"), "competencies.listByInterview");
        return (data as Db[]).map(toCompetency);
      },
      async findById(id) {
        const data = check(await db.from("competencies").select().eq("id", id).maybeSingle(), "competencies.findById");
        return data ? toCompetency(data as Db) : null;
      },
    },
    questions: {
      async insertMany(interviewId, rows) {
        if (!rows.length) return [];
        const data = check(
          await db
            .from("questions")
            .insert(rows.map((r) => ({ interview_id: interviewId, competency_id: r.competencyId, text: r.text, jd_quote: r.jdQuote, ord: r.ord })))
            .select(),
          "questions.insertMany",
        );
        return (data as Db[]).map(toQuestion).sort((a, b) => a.ord - b.ord);
      },
      async listByInterview(interviewId) {
        const data = check(await db.from("questions").select().eq("interview_id", interviewId).order("ord"), "questions.listByInterview");
        return (data as Db[]).map(toQuestion);
      },
      async findById(id) {
        const data = check(await db.from("questions").select().eq("id", id).maybeSingle(), "questions.findById");
        return data ? toQuestion(data as Db) : null;
      },
    },
    sessions: {
      async create(tokenHash) {
        const data = check(await db.from("sessions").insert({ token_hash: tokenHash }).select().single(), "sessions.create");
        return toSession(data as SessionDb);
      },
      async findByTokenHash(tokenHash) {
        const data = check(
          await db.from("sessions").select().eq("token_hash", tokenHash).is("deleted_at", null).maybeSingle(),
          "sessions.findByTokenHash",
        );
        return data ? toSession(data as SessionDb) : null;
      },
      async touch(id, at) {
        check(await db.from("sessions").update({ last_seen_at: at.toISOString() }).eq("id", id), "sessions.touch");
      },
      async setConsent(id, at) {
        check(await db.from("sessions").update({ consent_at: at.toISOString() }).eq("id", id), "sessions.setConsent");
      },
      async findById(id) {
        const data = check(await db.from("sessions").select().eq("id", id).is("deleted_at", null).maybeSingle(), "sessions.findById");
        return data ? toSession(data as SessionDb) : null;
      },
      async list(limit) {
        const data = check(
          await db.from("sessions").select().is("deleted_at", null).order("created_at", { ascending: false }).limit(limit),
          "sessions.list",
        );
        return (data as SessionDb[]).map(toSession);
      },
      async delete(id) {
        // Audio objects are removed by the caller (storage is separate from rows) before this runs.
        check(await db.from("sessions").delete().eq("id", id), "sessions.delete");
      },
    },
    events: {
      async insert(row: EventRow) {
        check(
          await db.from("events").insert({ session_id: row.sessionId, name: row.name, props: row.props, at: row.at.toISOString() }),
          "events.insert",
        );
      },
      async list(filter = {}) {
        let q = db.from("events").select("session_id, name, props, at").order("at");
        if (filter.sessionId) q = q.eq("session_id", filter.sessionId);
        if (filter.name) q = q.eq("name", filter.name);
        const data = check(await q, "events.list") as { session_id: string | null; name: string; props: EventRow["props"]; at: string }[];
        return data.map((r) => ({ sessionId: r.session_id, name: r.name, props: r.props, at: new Date(r.at) }));
      },
    },
    aiCalls: {
      async insert(row: AiCallRow) {
        check(
          await db.from("ai_calls").insert({
            session_id: row.sessionId, purpose: row.purpose, provider: row.provider, model: row.model,
            latency_ms: row.latencyMs, input_tokens: row.inputTokens ?? null, output_tokens: row.outputTokens ?? null,
            audio_ms: row.audioMs ?? null, status: row.status, at: row.at.toISOString(),
          }),
          "ai_calls.insert",
        );
      },
      async list(filter = {}) {
        let q = db.from("ai_calls").select().order("at");
        if (filter.sessionId) q = q.eq("session_id", filter.sessionId);
        const data = check(await q, "ai_calls.list") as Record<string, unknown>[];
        return data.map((r) => ({
          sessionId: r.session_id as string | null, purpose: r.purpose as string, provider: r.provider as string,
          model: r.model as string, latencyMs: r.latency_ms as number, inputTokens: r.input_tokens as number | null,
          outputTokens: r.output_tokens as number | null, audioMs: r.audio_ms as number | null,
          status: r.status as AiCallRow["status"], at: new Date(r.at as string),
        }));
      },
      async reserve({ sessionId, purpose, provider, sessionLimit, globalLimit, since }) {
        const data = check(
          await db.rpc("reserve_ai_call", {
            p_session: sessionId, p_purpose: purpose, p_provider: provider,
            p_session_limit: sessionLimit, p_global_limit: globalLimit, p_since: since.toISOString(),
          }),
          "ai_calls.reserve",
        ) as { id?: number | string; denied?: "session" | "global" };
        if (data?.denied) return { denied: data.denied };
        if (data?.id === undefined || data?.id === null) throw new Error("Supabase ai_calls.reserve returned no id");
        return { id: String(data.id) };
      },
      async complete(id, o) {
        check(
          await db
            .from("ai_calls")
            .update({ model: o.model, latency_ms: o.latencyMs, input_tokens: o.inputTokens ?? null, output_tokens: o.outputTokens ?? null, audio_ms: o.audioMs ?? null, status: o.status })
            .eq("id", Number(id)),
          "ai_calls.complete",
        );
      },
    },
    rateLimits: {
      async hit(key, windowMs, max) {
        const allowed = check(
          await db.rpc("hit_rate_limit", { p_key: key, p_window_seconds: Math.ceil(windowMs / 1000), p_max: max }),
          "rateLimits.hit",
        );
        return allowed === true;
      },
    },
  };
}
