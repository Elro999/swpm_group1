import { describe, expect, it } from "vitest";
import { createMemoryAudioStore } from "@/lib/audio";
import { createMemoryRepo } from "@/lib/db/memory";
import { purgeExpiredAudio, RetentionError } from "./retention";

const DAY = 86_400_000;

describe("audio retention (30 days, review fix)", () => {
  it("deletes recordings older than 30 days, clears their keys, and keeps newer ones and the text", async () => {
    const repo = createMemoryRepo();
    let clock = new Date("2026-10-01T00:00:00Z");
    const audio = createMemoryAudioStore(() => clock);
    const session = await repo.sessions.create("h");
    const iv = await repo.interviews.create({ sessionId: session.id, jdText: "jd", cvText: null, interviewDate: null });
    const [q] = await repo.questions.insertMany(iv.id, [{ competencyId: null, text: "q", jdQuote: "jd", ord: 0 }]);
    const old = await repo.attempts.create({ questionId: q.id, attemptNo: 1 });
    await audio.put(`${session.id}/${old.id}/answer`, new Uint8Array([1]), "audio/webm");
    await repo.attempts.update(old.id, { answerAudioKey: `${session.id}/${old.id}/answer`, answerText: "kept text" });
    await audio.put(`${session.id}/orphan/answer`, new Uint8Array([1]), "audio/webm"); // no row points to it

    clock = new Date("2026-10-25T00:00:00Z");
    const recent = await repo.attempts.create({ questionId: q.id, attemptNo: 2 });
    await audio.put(`${session.id}/${recent.id}/answer`, new Uint8Array([1]), "audio/webm");
    await repo.attempts.update(recent.id, { answerAudioKey: `${session.id}/${recent.id}/answer` });

    const now = new Date("2026-11-05T00:00:00Z"); // old ones are 35 days old, recent is 11 days old
    const res = await purgeExpiredAudio(repo, audio, now);
    expect(res.deleted).toBe(2);
    expect(await audio.get(`${session.id}/${old.id}/answer`)).toBeNull();
    expect(await audio.get(`${session.id}/orphan/answer`)).toBeNull();
    expect(await audio.get(`${session.id}/${recent.id}/answer`)).not.toBeNull();
    const after = await repo.attempts.findById(old.id);
    expect(after).toMatchObject({ answerAudioKey: null, answerText: "kept text" });
    expect((await repo.attempts.findById(recent.id))!.answerAudioKey).not.toBeNull();
    expect((await repo.events.list({ name: "audio_retention_run" }))[0]).toMatchObject({ sessionId: null, props: { deleted: 2, days: 30 } });
    expect(now.getTime() - new Date(res.cutoff).getTime()).toBe(30 * DAY);
  });

  it("fails loudly and keeps the keys when storage does not actually delete", async () => {
    const repo = createMemoryRepo();
    const audio = createMemoryAudioStore(() => new Date("2026-01-01T00:00:00Z"));
    await audio.put("s/a/answer", new Uint8Array([1]), "audio/webm");
    const stuck = { ...audio, remove: async () => undefined }; // reports success but deletes nothing
    await expect(purgeExpiredAudio(repo, stuck, new Date("2026-03-01T00:00:00Z"))).rejects.toBeInstanceOf(RetentionError);
    expect(await audio.get("s/a/answer")).not.toBeNull();
  });
});
