import { describe, expect, it } from "vitest";
import { createMemoryRepo } from "@/lib/db/memory";
import { containsQuote, splitSentences } from "@/lib/text";
import { SAMPLE_CV, SAMPLE_JD, SAMPLE_STORIES } from "@/test/fixtures";
import { withAiCall } from "./log";
import { createMockLlm } from "./mock/llm";
import { createMockStt } from "./mock/stt";

const llm = createMockLlm();
const stt = createMockStt();

describe("mock LLM honours the contracts and quotes verbatim", () => {
  it("competencies: 4–6, each quote is in the JD", async () => {
    const { data } = await llm.run("competencies", { jd: SAMPLE_JD });
    expect(data.competencies.length).toBeGreaterThanOrEqual(4);
    for (const c of data.competencies) expect(containsQuote(SAMPLE_JD, c.jd_quote)).toBe(true);
  });

  it("competencies: still valid for a short JD", async () => {
    const { data } = await llm.run("competencies", { jd: "Analyst role. Must handle data well." });
    expect(data.competencies.length).toBeGreaterThanOrEqual(4);
  });

  it("questions: 3–5 behavioural questions tied to JD quotes", async () => {
    const { data: c } = await llm.run("competencies", { jd: SAMPLE_JD });
    const { data } = await llm.run("questions", { jd: SAMPLE_JD, competencies: c.competencies });
    expect(data.questions.length).toBeGreaterThanOrEqual(3);
    expect(data.questions.length).toBeLessThanOrEqual(5);
    for (const q of data.questions) expect(containsQuote(SAMPLE_JD, q.jd_quote)).toBe(true);
  });

  it("follow-up quotes a phrase from the answer", async () => {
    const { transcript } = await stt.transcribe({ audio: new Uint8Array(), mimeType: "audio/webm" });
    const { data } = await llm.run("followup", { question: "q", transcript: transcript.text });
    expect(containsQuote(transcript.text, data.quote)).toBe(true);
  });

  it("fit feedback (judgement only) finds the decision sentence and a vague claim, with verbatim quotes", async () => {
    const { transcript } = await stt.transcribe({ audio: new Uint8Array(), mimeType: "audio/webm", attemptNo: 1 });
    const sentences = splitSentences(transcript.text).map((s) => s.text);
    const { data } = await llm.run("fit_feedback", { question: "q", competency: "c", transcript: transcript.text, sentences });
    const ids = data.points.map((p) => p.check_id);
    expect(data.decision_sentence_index).toBe(3);
    expect(ids).toContain("vague_claim");
    // Delivery checks belong to code (modules/feedback), never to the model.
    expect(ids).not.toContain("late_decision");
    expect(ids).not.toContain("we_not_i");
    for (const p of data.points) expect(containsQuote(transcript.text, p.quote)).toBe(true);
  });

  it("fit feedback on a retry sees the decision in the first sentence", async () => {
    const { transcript } = await stt.transcribe({ audio: new Uint8Array(), mimeType: "audio/webm", attemptNo: 2 });
    const sentences = splitSentences(transcript.text).map((s) => s.text);
    const { data } = await llm.run("fit_feedback", { question: "q", competency: "c", transcript: transcript.text, sentences });
    expect(data.decision_sentence_index).toBe(0);
    expect(data.competency_shown).toBe(true);
  });

  it("story structure: one story per paragraph, spans point into the original text", async () => {
    const { data } = await llm.run("story_structure", { text: SAMPLE_STORIES });
    expect(data.stories).toHaveLength(2);
    for (const s of data.stories) {
      expect(SAMPLE_STORIES.slice(s.situation.start, s.situation.end)).toBe(s.situation.text);
      if (s.decision) expect(SAMPLE_STORIES.slice(s.decision.start, s.decision.end)).toBe(s.decision.text);
    }
    expect(data.stories[0].sentences.some((x) => x.flags.includes("we"))).toBe(true);
  });

  it("gap prompts reference lines that exist in the CV", async () => {
    const { data } = await llm.run("gap_prompts", { competency: "Handling ambiguity", cv: SAMPLE_CV });
    expect(data.prompts.length).toBeGreaterThanOrEqual(3);
    for (const p of data.prompts) for (const r of p.references) expect(containsQuote(SAMPLE_CV, r)).toBe(true);
  });
});

describe("mock STT", () => {
  it("returns increasing, non-overlapping word timestamps within the duration", async () => {
    const { transcript } = await stt.transcribe({ audio: new Uint8Array(), mimeType: "audio/webm" });
    let prevEnd = 0;
    for (const w of transcript.words) {
      expect(w.start).toBeGreaterThanOrEqual(prevEnd);
      expect(w.end).toBeGreaterThan(w.start);
      prevEnd = w.end;
    }
    expect(transcript.durationMs).toBeGreaterThan(prevEnd);
    expect(transcript.words.map((w) => w.w).join(" ")).toBe(transcript.text);
  });
});

describe("withAiCall", () => {
  it("logs metadata only on success", async () => {
    const repo = createMemoryRepo();
    let t = 1000;
    await withAiCall(
      repo,
      { sessionId: "s", purpose: "questions", provider: "mock" },
      async () => ({ model: "m", secret: "user text" }),
      () => (t += 50),
    );
    const [row] = await repo.aiCalls.list();
    expect(row).toMatchObject({ purpose: "questions", provider: "mock", model: "m", status: "ok", latencyMs: 50 });
    expect(JSON.stringify(row)).not.toContain("user text");
  });

  it("logs an error row and re-throws the original error", async () => {
    const repo = createMemoryRepo();
    await expect(
      withAiCall(repo, { sessionId: null, purpose: "fit_feedback", provider: "mock" }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await repo.aiCalls.list())[0].status).toBe("error");
  });

  it("stops a session at the daily limit (7.1) without calling the provider", async () => {
    const repo = createMemoryRepo();
    const meta = { sessionId: "s", purpose: "questions", provider: "mock" };
    const ok = async () => ({ model: "m" });
    const lim = { session: 2, global: 100 };
    await withAiCall(repo, meta, ok, Date.now, lim);
    await withAiCall(repo, meta, ok, Date.now, lim);
    let called = false;
    await expect(
      withAiCall(repo, meta, async () => { called = true; return { model: "m" }; }, Date.now, lim),
    ).rejects.toMatchObject({ name: "AiQuotaError", status: 429, scope: "session" });
    expect(called).toBe(false);
    // Other sessions are unaffected, and calls older than 24 h do not count.
    await expect(withAiCall(repo, { ...meta, sessionId: "other" }, ok, Date.now, lim)).resolves.toBeTruthy();
    await expect(withAiCall(repo, meta, ok, () => Date.now() + 86_400_001, lim)).resolves.toBeTruthy();
  });

  it("reserves capacity before calling, so concurrent calls cannot overshoot the limit (review fix)", async () => {
    const repo = createMemoryRepo();
    const meta = { sessionId: "s", purpose: "questions", provider: "mock" };
    let calls = 0;
    const slow = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return { model: "m" };
    };
    const results = await Promise.allSettled([1, 2, 3].map(() => withAiCall(repo, meta, slow, Date.now, { session: 1, global: 100 })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it("enforces a deployment-wide daily cap across sessions (review fix)", async () => {
    const repo = createMemoryRepo();
    const ok = async () => ({ model: "m" });
    const lim = { session: 10, global: 2 };
    await withAiCall(repo, { sessionId: "a", purpose: "q", provider: "mock" }, ok, Date.now, lim);
    await withAiCall(repo, { sessionId: "b", purpose: "q", provider: "mock" }, ok, Date.now, lim);
    await expect(withAiCall(repo, { sessionId: "c", purpose: "q", provider: "mock" }, ok, Date.now, lim)).rejects.toMatchObject({
      name: "AiQuotaError",
      scope: "global",
    });
  });
});
