import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryRepo } from "@/lib/db/memory";
import type { Repo } from "@/lib/db/types";
import { createMemoryAudioStore } from "@/lib/audio";
import { createMockLlm } from "@/modules/ai/mock/llm";
import { createMockStt } from "@/modules/ai/mock/stt";
import { skipFollowup, startAttempt, submitAnswerAudio } from "@/modules/attempt/service";
import { createInterview } from "@/modules/interview/service";
import { addStories } from "@/modules/stories/service";
import { SAMPLE_JD, SAMPLE_STORIES } from "@/test/fixtures";
import { deleteSession, findSessionByToken, noteVisit, RETURN_GAP_MS, startSession } from "./session";

describe("noteVisit (6.4: came back)", () => {
  it("records session_returned after a 12 h+ gap, with days since start, and updates last seen", async () => {
    const repo = createMemoryRepo();
    const { session } = await startSession(repo);
    const later = new Date(session.lastSeenAt.getTime() + RETURN_GAP_MS + 1000 + 8 * 86_400_000);
    const updated = await noteVisit(repo, session, later);
    const [e] = await repo.events.list({ sessionId: session.id, name: "session_returned" });
    expect(e.props).toEqual({ days_since_start: 8 });
    expect(updated.lastSeenAt).toEqual(later);
  });

  it("does not count ordinary navigation, and throttles last-seen writes", async () => {
    const repo = createMemoryRepo();
    const { session } = await startSession(repo);
    expect(await noteVisit(repo, session, new Date(session.lastSeenAt.getTime() + 60_000))).toBe(session); // < 5 min: untouched
    await noteVisit(repo, session, new Date(session.lastSeenAt.getTime() + 60 * 60_000)); // 1 h: touched, not a return
    expect(await repo.events.list({ sessionId: session.id, name: "session_returned" })).toEqual([]);
  });
});

describe("deleteSession (6.3: delete my data)", () => {
  it("removes recordings and every row, and leaves only an anonymous event", async () => {
    const repo = createMemoryRepo();
    const audio = createMemoryAudioStore();
    const llm = createMockLlm();
    const { session, token } = await startSession(repo);
    await repo.sessions.setConsent(session.id, new Date());
    const consented = (await findSessionByToken(repo, token))!;
    const { questions, interview } = await createInterview({ repo, llm }, session.id, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    const deps = { repo, llm, stt: createMockStt(), audio };
    const a = await startAttempt(deps, consented, questions[0].id);
    const withAudio = await submitAnswerAudio(deps, consented, a.id, new Uint8Array([1, 2, 3]), "audio/webm");
    await skipFollowup(deps, consented, a.id);
    await addStories({ repo, llm }, session.id, SAMPLE_STORIES);
    expect(await audio.get(withAudio.answerAudioKey!)).not.toBeNull();

    const result = await deleteSession(repo, session.id, audio);
    expect(result.audioFiles).toBe(1);
    expect(await audio.get(withAudio.answerAudioKey!)).toBeNull();
    expect(await findSessionByToken(repo, token)).toBeNull();
    expect(await repo.interviews.findForSession(interview.id, session.id)).toBeNull();
    expect(await repo.stories.listBySession(session.id)).toEqual([]);
    expect(await repo.attempts.findById(a.id)).toBeNull();
    const deleted = await repo.events.list({ name: "data_deleted" });
    expect(deleted).toHaveLength(1);
    expect(deleted[0].sessionId).toBeNull();
  });

  it("deletes nothing if removing the audio fails, so the user can retry", async () => {
    const repo = createMemoryRepo();
    const llm = createMockLlm();
    const { session, token } = await startSession(repo);
    await repo.sessions.setConsent(session.id, new Date());
    const consented = (await findSessionByToken(repo, token))!;
    const audio = createMemoryAudioStore();
    const { questions } = await createInterview({ repo, llm }, session.id, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    const deps = { repo, llm, stt: createMockStt(), audio };
    const a = await startAttempt(deps, consented, questions[0].id);
    await submitAnswerAudio(deps, consented, a.id, new Uint8Array([1]), "audio/webm");
    const broken = { ...audio, remove: async () => { throw new Error("storage down"); } };
    await expect(deleteSession(repo, session.id, broken)).rejects.toThrow("storage down");
    expect(await findSessionByToken(repo, token)).not.toBeNull();
  });

  it("also deletes recordings no row points to, by sweeping the session's storage folder (review fix)", async () => {
    const repo = createMemoryRepo();
    const { session } = await startSession(repo);
    const audio = createMemoryAudioStore();
    await audio.put(`${session.id}/orphan-attempt/answer`, new Uint8Array([1]), "audio/webm");
    await audio.put("someone-else/x/answer", new Uint8Array([1]), "audio/webm");
    const { audioFiles } = await deleteSession(repo, session.id, audio);
    expect(audioFiles).toBe(1);
    expect(await audio.list({ prefix: `${session.id}/`, limit: 10 })).toEqual([]);
    expect(await audio.get("someone-else/x/answer")).not.toBeNull();
  });
});

describe("session service", () => {
  let repo: Repo;
  beforeEach(() => {
    repo = createMemoryRepo();
  });

  it("starts a session without any user input and finds it again by token", async () => {
    const { session, token } = await startSession(repo);
    const found = await findSessionByToken(repo, token);
    expect(found?.id).toBe(session.id);
  });

  it("stores only the hash of the token", async () => {
    const { session, token } = await startSession(repo);
    expect(session.tokenHash).not.toBe(token);
  });

  it("returns null for an unknown or malformed token", async () => {
    await startSession(repo);
    expect(await findSessionByToken(repo, "x".repeat(43))).toBeNull();
    expect(await findSessionByToken(repo, "not-a-token")).toBeNull();
    expect(await findSessionByToken(repo, undefined)).toBeNull();
  });

  it("records session_started without user text", async () => {
    const { session } = await startSession(repo);
    const events = await repo.events.list({ sessionId: session.id });
    expect(events.map((e) => e.name)).toEqual(["session_started"]);
    expect(events[0].props).toEqual({});
  });

  it("makes the token stop working after deletion", async () => {
    const { session, token } = await startSession(repo);
    await deleteSession(repo, session.id);
    expect(await findSessionByToken(repo, token)).toBeNull();
    expect(await repo.events.list({ sessionId: session.id })).toEqual([]);
  });
});
