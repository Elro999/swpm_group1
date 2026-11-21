import { describe, expect, it } from "vitest";
import { createMemoryRepo } from "./memory";

describe("memory repo", () => {
  it("keeps separate instances isolated", async () => {
    const a = createMemoryRepo();
    const b = createMemoryRepo();
    await a.sessions.create("hash-a");
    expect(await b.sessions.findByTokenHash("hash-a")).toBeNull();
  });

  it("updates last_seen_at and consent", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("h");
    const later = new Date(s.lastSeenAt.getTime() + 60_000);
    await repo.sessions.touch(s.id, later);
    await repo.sessions.setConsent(s.id, later);
    const found = await repo.sessions.findByTokenHash("h");
    expect(found?.lastSeenAt).toEqual(later);
    expect(found?.consentAt).toEqual(later);
  });

  it("returns copies so callers cannot mutate stored rows", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("h");
    s.tokenHash = "tampered";
    expect((await repo.sessions.findByTokenHash("h"))?.tokenHash).toBe("h");
  });

  it("deletes a session's events and ai calls with it (cascade)", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("h");
    await repo.events.insert({ sessionId: s.id, name: "session_started", props: {}, at: new Date() });
    await repo.aiCalls.insert({
      sessionId: s.id, purpose: "questions", provider: "mock", model: "mock",
      latencyMs: 1, status: "ok", at: new Date(),
    });
    await repo.sessions.delete(s.id);
    expect(await repo.events.list({ sessionId: s.id })).toEqual([]);
    expect(await repo.aiCalls.list({ sessionId: s.id })).toEqual([]);
  });
});

describe("memory repo: interviews (Phase 1)", () => {
  const jd = "Own the roadmap. Ship every sprint.";

  it("only returns an interview to the session that owns it", async () => {
    const repo = createMemoryRepo();
    const a = await repo.sessions.create("a");
    const b = await repo.sessions.create("b");
    const iv = await repo.interviews.create({ sessionId: a.id, jdText: jd, cvText: null, interviewDate: null });
    expect((await repo.interviews.findForSession(iv.id, a.id))?.id).toBe(iv.id);
    expect(await repo.interviews.findForSession(iv.id, b.id)).toBeNull();
  });

  it("lists a session's interviews newest first", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("a");
    const first = await repo.interviews.create({ sessionId: s.id, jdText: jd, cvText: null, interviewDate: null });
    await new Promise((r) => setTimeout(r, 2));
    const second = await repo.interviews.create({ sessionId: s.id, jdText: jd, cvText: null, interviewDate: "2026-12-01" });
    expect((await repo.interviews.listBySession(s.id)).map((i) => i.id)).toEqual([second.id, first.id]);
  });

  it("stores competencies and questions in order and cascades on session delete", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("a");
    const iv = await repo.interviews.create({ sessionId: s.id, jdText: jd, cvText: null, interviewDate: null });
    const [c2, c1] = await repo.competencies.insertMany(iv.id, [
      { label: "Ship", jdQuote: "Ship every sprint.", jdQuoteStart: 17, jdQuoteEnd: 35, ord: 1 },
      { label: "Roadmap", jdQuote: "Own the roadmap.", jdQuoteStart: 0, jdQuoteEnd: 16, ord: 0 },
    ]);
    expect((await repo.competencies.listByInterview(iv.id)).map((c) => c.id)).toEqual([c1.id, c2.id]);
    const [q] = await repo.questions.insertMany(iv.id, [{ competencyId: c1.id, text: "Tell me about a roadmap call.", jdQuote: "Own the roadmap.", ord: 0 }]);
    expect((await repo.questions.findById(q.id))?.interviewId).toBe(iv.id);

    await repo.sessions.delete(s.id);
    expect(await repo.interviews.listBySession(s.id)).toEqual([]);
    expect(await repo.competencies.listByInterview(iv.id)).toEqual([]);
    expect(await repo.questions.findById(q.id)).toBeNull();
  });
});
