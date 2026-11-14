import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryAudioStore } from "@/lib/audio";
import { createMemoryRepo } from "@/lib/db/memory";
import type { Repo, SessionRow } from "@/lib/db/types";
import { createMockLlm } from "@/modules/ai/mock/llm";
import { createMockStt } from "@/modules/ai/mock/stt";
import type { SttProvider } from "@/modules/ai/types";
import { createInterview } from "@/modules/interview/service";
import { SAMPLE_JD } from "@/test/fixtures";
import {
  AttemptError,
  markFeedbackViewed,
  ratePoint,
  resumeAttempt,
  skipFollowup,
  startAttempt,
  submitAnswerAudio,
  submitFollowupAudio,
  type AttemptDeps,
} from "./service";

const AUDIO = new Uint8Array([1, 2, 3, 4]);
const WEBM = "audio/webm;codecs=opus";

async function setup(stt: SttProvider = createMockStt()) {
  const repo: Repo = createMemoryRepo();
  const deps: AttemptDeps = { repo, llm: createMockLlm(), stt, audio: createMemoryAudioStore() };
  let session = await repo.sessions.create("h");
  await repo.sessions.setConsent(session.id, new Date());
  session = (await repo.sessions.findByTokenHash("h"))!;
  const { questions } = await createInterview({ repo, llm: deps.llm }, session.id, { jd: SAMPLE_JD, cv: null, interviewDate: null });
  return { repo, deps, session, questionId: questions[0].id };
}

describe("attempt pipeline", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    ctx = await setup();
  });

  it("runs answer → follow-up → skip → pinned feedback", async () => {
    const { deps, session, questionId, repo } = ctx;
    const a = await startAttempt(deps, session, questionId);
    expect(a.attemptNo).toBe(1);

    const afterAnswer = await submitAnswerAudio(deps, session, a.id, AUDIO, WEBM);
    expect(afterAnswer.status).toBe("followup_ready");
    expect(afterAnswer.answerWords!.length).toBeGreaterThan(10);
    expect(afterAnswer.answerText).toContain(afterAnswer.followupQuote!);

    const done = await skipFollowup(deps, session, a.id);
    expect(done.status).toBe("ready");
    const fb = await repo.feedback.get(a.id);
    expect(fb.metrics?.timeToDecisionMs).toBeGreaterThan(0);
    expect(fb.points.map((p) => p.checkId)).toEqual(expect.arrayContaining(["late_decision", "we_not_i"]));
    for (const p of fb.points) expect(afterAnswer.answerText!.toLowerCase()).toContain(p.quote.toLowerCase());

    const events = (await repo.events.list({ sessionId: session.id })).map((e) => e.name);
    expect(events).toEqual(expect.arrayContaining(["recording_started", "attempt_transcribed", "followup_shown"]));
  });

  it("transcribes a recorded follow-up before analysing", async () => {
    const { deps, session, questionId } = ctx;
    const a = await startAttempt(deps, session, questionId);
    await submitAnswerAudio(deps, session, a.id, AUDIO, WEBM);
    const done = await submitFollowupAudio(deps, session, a.id, AUDIO, WEBM);
    expect(done.status).toBe("ready");
    expect(done.followupWords!.length).toBeGreaterThan(0);
  });

  it("refuses to record without consent, for someone else's question, or a bad file", async () => {
    const { deps, session, questionId, repo } = ctx;
    const noConsent = { ...session, consentAt: null };
    await expect(startAttempt(deps, noConsent, questionId)).rejects.toMatchObject({ status: 403 });

    const stranger: SessionRow = { ...(await repo.sessions.create("other")), consentAt: new Date() };
    await expect(startAttempt(deps, stranger, questionId)).rejects.toMatchObject({ status: 404 });

    const a = await startAttempt(deps, session, questionId);
    await expect(submitAnswerAudio(deps, stranger, a.id, AUDIO, WEBM)).rejects.toMatchObject({ status: 404 });
    await expect(submitAnswerAudio(deps, session, a.id, AUDIO, "text/html")).rejects.toMatchObject({ status: 415 });
    await expect(submitAnswerAudio(deps, session, a.id, new Uint8Array(), WEBM)).rejects.toMatchObject({ status: 400 });
  });

  it("numbers retries and records retry_started", async () => {
    const { deps, session, questionId, repo } = ctx;
    await startAttempt(deps, session, questionId);
    const second = await startAttempt(deps, session, questionId);
    expect(second.attemptNo).toBe(2);
    expect(await repo.events.list({ sessionId: session.id, name: "retry_started" })).toHaveLength(1);
  });

  it("marks feedback viewed once per attempt and first_feedback_viewed once per session", async () => {
    const { deps, session, questionId, repo } = ctx;
    const a = await startAttempt(deps, session, questionId);
    await submitAnswerAudio(deps, session, a.id, AUDIO, WEBM);
    await expect(markFeedbackViewed(deps, session, a.id)).rejects.toBeInstanceOf(AttemptError); // not ready yet
    await skipFollowup(deps, session, a.id);
    await markFeedbackViewed(deps, session, a.id);
    await markFeedbackViewed(deps, session, a.id);
    expect(await repo.events.list({ sessionId: session.id, name: "feedback_viewed" })).toHaveLength(1);
    const first = await repo.events.list({ sessionId: session.id, name: "first_feedback_viewed" });
    expect(first).toHaveLength(1);
    expect(first[0].props.ms_since_start).toBeGreaterThanOrEqual(0);
  });

  it("lets the owner mark a point not useful, and nobody else", async () => {
    const { deps, session, questionId, repo } = ctx;
    const a = await startAttempt(deps, session, questionId);
    await submitAnswerAudio(deps, session, a.id, AUDIO, WEBM);
    await skipFollowup(deps, session, a.id);
    const [p] = (await repo.feedback.get(a.id)).points;
    await ratePoint(deps, session, p.id, { notUseful: true, reason: "  not what I meant  " });
    expect((await repo.pointRatings.listByPoints([p.id]))[0]).toMatchObject({ notUseful: true, reason: "not what I meant" });
    const stranger = await repo.sessions.create("x");
    await expect(ratePoint(deps, stranger, p.id, { notUseful: true, reason: null })).rejects.toMatchObject({ status: 404 });
  });
});

describe("failures are recoverable without re-recording", () => {
  it("a transcription failure keeps the audio, and resume finishes the step", async () => {
    let calls = 0;
    const real = createMockStt();
    const flaky: SttProvider = {
      name: "flaky",
      async transcribe(req) {
        if (calls++ === 0) throw new Error("provider timeout");
        return real.transcribe(req);
      },
    };
    const { deps, session, questionId, repo } = await setup(flaky);
    const a = await startAttempt(deps, session, questionId);
    const failed = await submitAnswerAudio(deps, session, a.id, AUDIO, WEBM);
    expect(failed.status).toBe("failed");
    expect(failed.error).toMatch(/audio is saved/);
    expect(failed.answerAudioKey).not.toBeNull();

    const resumed = await resumeAttempt(deps, session, a.id);
    expect(resumed.status).toBe("followup_ready");
    expect((await repo.aiCalls.list({ sessionId: session.id })).some((c) => c.status === "error")).toBe(true);
  });

  it("silence asks the user to record again", async () => {
    const silent: SttProvider = { name: "silent", async transcribe() { return { transcript: { words: [], text: "", durationMs: 1000 }, model: "s" }; } };
    const { deps, session, questionId } = await setup(silent);
    const a = await startAttempt(deps, session, questionId);
    const r = await submitAnswerAudio(deps, session, a.id, AUDIO, WEBM);
    expect(r.status).toBe("failed");
    expect(r.error).toMatch(/couldn't hear anything/);
    expect(r.answerAudioKey).toBeNull();
    // The silent recording itself is deleted, not just forgotten (review fix).
    expect(await deps.audio.list({ prefix: `${session.id}/`, limit: 10 })).toEqual([]);
    // ...and a new upload to the same attempt is accepted.
    await expect(submitAnswerAudio(deps, session, a.id, AUDIO, WEBM)).resolves.toMatchObject({ status: "failed" });
  });

  it("silence: if the recording cannot be deleted, its key is kept so deletion can still find it", async () => {
    const silent: SttProvider = { name: "silent", async transcribe() { return { transcript: { words: [], text: "", durationMs: 1000 }, model: "s" }; } };
    const { deps, session, questionId } = await setup(silent);
    const broken = { ...deps, audio: { ...deps.audio, remove: async () => { throw new Error("storage down"); } } };
    const a = await startAttempt(broken, session, questionId);
    const r = await submitAnswerAudio(broken, session, a.id, AUDIO, WEBM);
    expect(r.status).toBe("failed");
    expect(r.answerAudioKey).not.toBeNull();
  });
});

describe("exclusive processing (review fix)", () => {
  it("two simultaneous resumes: one runs the model, the other gets a 409", async () => {
    const { deps, session, questionId } = await setup();
    let modelCalls = 0;
    const slowLlm = {
      name: "slow",
      run: (async (task: never, input: never) => {
        modelCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return deps.llm.run(task, input);
      }) as typeof deps.llm.run,
    };
    const d = { ...deps, llm: slowLlm };
    const a = await startAttempt(d, session, questionId);
    await submitAnswerAudio(d, session, a.id, AUDIO, WEBM);
    await d.repo.attempts.update(a.id, { followupSkipped: true, status: "failed" });
    modelCalls = 0;
    const results = await Promise.allSettled([resumeAttempt(d, session, a.id), resumeAttempt(d, session, a.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ name: "AttemptError", status: 409 });
    expect(modelCalls).toBe(1);
    // The lease is released afterwards, so a later request works.
    await expect(resumeAttempt(d, session, a.id)).resolves.toMatchObject({ status: "ready" });
  });

  it("an expired lease (crashed request) does not block the attempt forever", async () => {
    const { deps, session, questionId, repo } = await setup();
    const a = await startAttempt(deps, session, questionId);
    expect(await repo.attempts.claim(a.id, new Date(Date.now() - 1), new Date(Date.now() - 1000))).not.toBeNull(); // lease already expired
    await expect(submitAnswerAudio(deps, session, a.id, AUDIO, WEBM)).resolves.toMatchObject({ status: "followup_ready" });
  });
});
