import type { AudioStore } from "@/lib/audio";
import { ALLOWED_AUDIO_MIME, audioKey, MAX_AUDIO_BYTES } from "@/lib/audio";
import type { AttemptRow, InterviewRow, QuestionRow, Repo, SessionRow } from "@/lib/db/types";
import { AiQuotaError, withAiCall } from "@/modules/ai/log";
import type { LlmProvider, SttProvider } from "@/modules/ai/types";
import { recordEvent } from "@/modules/events/events";
import { buildFeedback } from "@/modules/feedback/build";
import { verifyFollowup } from "@/modules/feedback/guards";
import { buildCanonical } from "@/modules/feedback/transcript";

/**
 * The practice attempt pipeline (MF2–MF7; state machine in doc 02 §4).
 *
 *   created ──answer audio──▶ uploaded → transcribing → transcribed → followup_ready
 *   followup_ready ──follow-up audio──▶ followup_uploaded → transcribing → followup_transcribed → analysing → ready
 *   followup_ready ──skip──▶ analysing → ready
 *   any step ──error──▶ failed (stored data kept; `advance` resumes from the first missing piece)
 *
 * `advance` is data-driven: it looks at what is stored and does the next missing step, so retrying a
 * failed step never needs the user to record again.
 */

export interface AttemptDeps {
  repo: Repo;
  llm: LlmProvider;
  stt: SttProvider;
  audio: AudioStore;
}

export class AttemptError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409 | 413 | 415, message: string) {
    super(message);
    this.name = "AttemptError";
  }
}

export interface OwnedQuestion {
  question: QuestionRow;
  interview: InterviewRow;
}

export async function loadOwnedQuestion(repo: Repo, questionId: string, sessionId: string): Promise<OwnedQuestion | null> {
  const question = await repo.questions.findById(questionId);
  if (!question) return null;
  const interview = await repo.interviews.findForSession(question.interviewId, sessionId);
  return interview ? { question, interview } : null;
}

export async function loadOwnedAttempt(repo: Repo, attemptId: string, sessionId: string): Promise<(OwnedQuestion & { attempt: AttemptRow }) | null> {
  const attempt = await repo.attempts.findById(attemptId);
  if (!attempt) return null;
  const owned = await loadOwnedQuestion(repo, attempt.questionId, sessionId);
  return owned ? { ...owned, attempt } : null;
}

async function requireOwnedAttempt(repo: Repo, attemptId: string, sessionId: string) {
  const owned = await loadOwnedAttempt(repo, attemptId, sessionId);
  if (!owned) throw new AttemptError(404, "That practice attempt was not found.");
  return owned;
}

function checkAudio(bytes: Uint8Array, mime: string) {
  if (!ALLOWED_AUDIO_MIME.test(mime)) throw new AttemptError(415, "That recording format is not supported. Please use Chrome, Edge, Firefox or Safari.");
  if (bytes.byteLength === 0) throw new AttemptError(400, "The recording was empty. Please record again.");
  if (bytes.byteLength > MAX_AUDIO_BYTES) throw new AttemptError(413, "That recording is too long. Keep answers under three minutes.");
}

/** Begin a new attempt at a question. Requires consent (PF2) and ownership. */
export async function startAttempt({ repo }: Pick<AttemptDeps, "repo">, session: SessionRow, questionId: string): Promise<AttemptRow> {
  if (!session.consentAt) throw new AttemptError(403, "Please agree to the recording notice first.");
  const owned = await loadOwnedQuestion(repo, questionId, session.id);
  if (!owned) throw new AttemptError(404, "That question was not found.");
  const previous = await repo.attempts.listByQuestion(questionId);
  const attemptNo = (previous.at(-1)?.attemptNo ?? 0) + 1;
  const attempt = await repo.attempts.create({ questionId, attemptNo });
  await recordEvent(repo, session.id, "recording_started", { attempt_no: attemptNo });
  if (attemptNo > 1) await recordEvent(repo, session.id, "retry_started", { attempt_no: attemptNo });
  return attempt;
}

export async function submitAnswerAudio(deps: AttemptDeps, session: SessionRow, attemptId: string, bytes: Uint8Array, mime: string): Promise<AttemptRow> {
  if (!session.consentAt) throw new AttemptError(403, "Please agree to the recording notice first.");
  const owned = await requireOwnedAttempt(deps.repo, attemptId, session.id);
  if (owned.attempt.answerWords) throw new AttemptError(409, "This answer was already recorded. Start a retry to record again.");
  checkAudio(bytes, mime);
  const key = audioKey(session.id, attemptId, "answer");
  await deps.audio.put(key, bytes, mime);
  const attempt = await deps.repo.attempts.update(attemptId, { answerAudioKey: key, answerAudioMime: mime, status: "uploaded", error: null });
  return advance(deps, session.id, { ...owned, attempt });
}

export async function submitFollowupAudio(deps: AttemptDeps, session: SessionRow, attemptId: string, bytes: Uint8Array, mime: string): Promise<AttemptRow> {
  if (!session.consentAt) throw new AttemptError(403, "Please agree to the recording notice first.");
  const owned = await requireOwnedAttempt(deps.repo, attemptId, session.id);
  const a = owned.attempt;
  if (!a.followupText || a.followupSkipped || a.followupWords) throw new AttemptError(409, "There is no follow-up waiting for an answer.");
  checkAudio(bytes, mime);
  const key = audioKey(session.id, attemptId, "followup");
  await deps.audio.put(key, bytes, mime);
  const attempt = await deps.repo.attempts.update(attemptId, { followupAudioKey: key, followupAudioMime: mime, status: "followup_uploaded", error: null });
  return advance(deps, session.id, { ...owned, attempt });
}

export async function skipFollowup(deps: AttemptDeps, session: SessionRow, attemptId: string): Promise<AttemptRow> {
  const owned = await requireOwnedAttempt(deps.repo, attemptId, session.id);
  const a = owned.attempt;
  if (!a.followupText || a.followupWords || a.followupAudioKey) throw new AttemptError(409, "There is no follow-up to skip.");
  const attempt = await deps.repo.attempts.update(attemptId, { followupSkipped: true });
  return advance(deps, session.id, { ...owned, attempt });
}

/** Re-run whatever step is missing (used by "Try again" after a failure). */
export async function resumeAttempt(deps: AttemptDeps, session: SessionRow, attemptId: string): Promise<AttemptRow> {
  const owned = await requireOwnedAttempt(deps.repo, attemptId, session.id);
  return advance(deps, session.id, owned);
}

const FAILURE_MESSAGES = {
  transcribe: "We couldn't turn your recording into text. Your audio is saved, so you can try again without recording.",
  followup: "We couldn't prepare the follow-up question. Please try again.",
  analyse: "We couldn't finish the feedback. Your answer is saved, so you can try again.",
} as const;

async function advance(deps: AttemptDeps, sessionId: string, owned: OwnedQuestion & { attempt: AttemptRow }): Promise<AttemptRow> {
  const { repo, llm, stt, audio } = deps;
  const { question, interview } = owned;
  let a = owned.attempt;
  let stage: keyof typeof FAILURE_MESSAGES = "transcribe";

  try {
    // 1. Transcribe the main answer.
    if (a.answerAudioKey && !a.answerWords) {
      stage = "transcribe";
      a = await repo.attempts.update(a.id, { status: "transcribing" });
      const file = await audio.get(a.answerAudioKey!);
      if (!file) throw new Error("audio missing");
      const res = await withAiCall(repo, { sessionId, purpose: "transcribe_answer", provider: stt.name }, async () => {
        const r = await stt.transcribe({ audio: file.bytes, mimeType: file.mime, attemptNo: a.attemptNo });
        return { ...r, audioMs: r.transcript.durationMs };
      });
      if (!res.transcript.words.length) {
        // Nothing heard: let the user record again instead of failing forever.
        return repo.attempts.update(a.id, {
          status: "failed",
          answerAudioKey: null,
          error: "We couldn't hear anything in that recording. Check your microphone and record again.",
        });
      }
      a = await repo.attempts.update(a.id, {
        status: "transcribed",
        answerWords: res.transcript.words,
        answerText: buildCanonical(res.transcript.words).text,
        answerDurationMs: res.transcript.durationMs,
      });
      await recordEvent(repo, sessionId, "attempt_transcribed", { attempt_no: a.attemptNo });
    }

    // 2. One follow-up, then wait for the user (MF3).
    if (a.answerWords && !a.followupText) {
      stage = "followup";
      const res = await withAiCall(repo, { sessionId, purpose: "followup", provider: llm.name }, () =>
        llm.run("followup", { question: question.text, transcript: a.answerText! }),
      );
      const f = verifyFollowup(a.answerText!, res.data);
      a = await repo.attempts.update(a.id, { status: "followup_ready", followupText: f.question, followupQuote: f.quote });
      await recordEvent(repo, sessionId, "followup_shown", { attempt_no: a.attemptNo, fallback: f.fallback });
      return a;
    }

    // 3. Transcribe the follow-up answer, if one was recorded.
    if (a.followupAudioKey && !a.followupWords) {
      stage = "transcribe";
      const key = a.followupAudioKey;
      a = await repo.attempts.update(a.id, { status: "transcribing" });
      const file = await audio.get(key);
      if (!file) throw new Error("audio missing");
      const res = await withAiCall(repo, { sessionId, purpose: "transcribe_followup", provider: stt.name }, async () => {
        const r = await stt.transcribe({ audio: file.bytes, mimeType: file.mime, attemptNo: a.attemptNo });
        return { ...r, audioMs: r.transcript.durationMs };
      });
      a = await repo.attempts.update(a.id, { status: "followup_transcribed", followupWords: res.transcript.words });
    }

    // 4. Analyse the main answer once the follow-up is answered or skipped.
    if (a.answerWords && (a.followupWords || a.followupSkipped) && a.status !== "ready") {
      stage = "analyse";
      const words = a.answerWords;
      const durationMs = a.answerDurationMs ?? 0;
      a = await repo.attempts.update(a.id, { status: "analysing" });
      const canonical = buildCanonical(words);
      const competency = question.competencyId
        ? (await repo.competencies.listByInterview(interview.id)).find((c) => c.id === question.competencyId)?.label ?? ""
        : "";
      const res = await withAiCall(repo, { sessionId, purpose: "fit_feedback", provider: llm.name }, () =>
        llm.run("fit_feedback", { question: question.text, competency, transcript: canonical.text, sentences: canonical.sentences.map((s) => s.text) }),
      );
      const built = buildFeedback(words, durationMs, res.data);
      await repo.feedback.save(a.id, built.metrics, built.points);
      a = await repo.attempts.update(a.id, { status: "ready", error: null });
    }
    return a;
  } catch (err) {
    if (err instanceof AttemptError || err instanceof AiQuotaError) throw err; // quota: nothing failed, just wait
    console.error("attempt step failed", { stage, name: (err as Error)?.name }); // no user content in logs
    return repo.attempts.update(a.id, { status: "failed", error: FAILURE_MESSAGES[stage] });
  }
}

/**
 * Record that feedback was seen (PF3). Server-side so the North Star inputs cannot be faked:
 * feedback_viewed once per attempt; first_feedback_viewed once per session (G1 timing);
 * retry_feedback_viewed for attempt 2+.
 */
export async function markFeedbackViewed({ repo }: Pick<AttemptDeps, "repo">, session: SessionRow, attemptId: string, now = new Date()): Promise<void> {
  const { attempt } = await requireOwnedAttempt(repo, attemptId, session.id);
  if (attempt.status !== "ready") throw new AttemptError(409, "Feedback is not ready yet.");
  const seen = await repo.events.list({ sessionId: session.id, name: "feedback_viewed" });
  if (seen.some((e) => e.props.attempt_id === attempt.id)) return;
  await recordEvent(repo, session.id, "feedback_viewed", { attempt_id: attempt.id, attempt_no: attempt.attemptNo }, now);
  if (!(await repo.events.list({ sessionId: session.id, name: "first_feedback_viewed" })).length) {
    await recordEvent(repo, session.id, "first_feedback_viewed", { ms_since_start: now.getTime() - session.createdAt.getTime() }, now);
  }
  if (attempt.attemptNo > 1) await recordEvent(repo, session.id, "retry_feedback_viewed", { attempt_no: attempt.attemptNo }, now);
}

/** MF7: mark a feedback point "not useful" (or undo). Feeds the teammate review queue. */
export async function ratePoint(
  { repo }: Pick<AttemptDeps, "repo">,
  session: SessionRow,
  pointId: string,
  rating: { notUseful: boolean; reason: string | null },
): Promise<void> {
  const point = await repo.feedback.findPoint(pointId);
  if (!point || !(await loadOwnedAttempt(repo, point.attemptId, session.id))) throw new AttemptError(404, "That feedback point was not found.");
  const reason = rating.reason?.trim().slice(0, 500) || null;
  await repo.pointRatings.set(pointId, { notUseful: rating.notUseful, reason });
  if (rating.notUseful) await recordEvent(repo, session.id, "point_marked_not_useful", { check_id: point.checkId });
}
