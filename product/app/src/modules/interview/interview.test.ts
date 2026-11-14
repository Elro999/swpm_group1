import { describe, expect, it } from "vitest";
import type { LlmTask, LlmTaskMap } from "@/lib/contracts";
import { createMemoryRepo } from "@/lib/db/memory";
import { createMockLlm } from "@/modules/ai/mock/llm";
import type { LlmProvider, LlmResult } from "@/modules/ai/types";
import { SAMPLE_JD } from "@/test/fixtures";
import { createInterview, InterviewGenerationError } from "./service";
import { validateInterviewInput } from "./validation";
import { verifyCompetencies, verifyQuestions } from "./verify";

/** A fake LLM whose answers are scripted per call, to test verifiers and retries. */
function scriptedLlm(script: Partial<{ [K in LlmTask]: LlmTaskMap[K]["output"][] }>): LlmProvider {
  const real = createMockLlm();
  const calls: Record<string, number> = {};
  return {
    name: "scripted",
    async run<K extends LlmTask>(task: K, input: LlmTaskMap[K]["input"]): Promise<LlmResult<K>> {
      const list = script[task] as LlmTaskMap[K]["output"][] | undefined;
      if (!list) return real.run(task, input);
      const i = (calls[task] = (calls[task] ?? -1) + 1);
      return { data: list[Math.min(i, list.length - 1)], model: "scripted", usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
}

const fabricated = {
  competencies: [
    { label: "Invented one", jd_quote: "Must speak five languages fluently." },
    { label: "Invented two", jd_quote: "Ten years of banking experience required." },
    { label: "Invented three", jd_quote: "Manage a team of fifty engineers." },
    { label: "Invented four", jd_quote: "Own a P&L above 100 crore." },
  ],
};

describe("validateInterviewInput", () => {
  it("accepts a real JD and normalises optional fields to null", () => {
    const r = validateInterviewInput({ jd: SAMPLE_JD, cv: "  ", interviewDate: "" });
    expect(r).toEqual({ ok: true, data: { jd: SAMPLE_JD, cv: null, interviewDate: null } });
  });

  it("explains exactly what is missing when the JD is too short", () => {
    const r = validateInterviewInput({ jd: "PM role, good pay." });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.jd).toMatch(/at least 150 characters/);
  });

  it("rejects text that is long enough but not a JD (too few words)", () => {
    const r = validateInterviewInput({ jd: "x".repeat(200) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.jd).toMatch(/responsibilities/);
  });

  it("rejects an impossible date and an oversized CV", () => {
    const r = validateInterviewInput({ jd: SAMPLE_JD, interviewDate: "2026-02-31", cv: "y ".repeat(10_001) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.interviewDate).toBeDefined();
      expect(r.errors.cv).toBeDefined();
    }
  });
});

describe("verifyCompetencies (no quote, no claim)", () => {
  it("keeps only quotes that are really in the JD, with exact offsets", () => {
    const { kept, dropped } = verifyCompetencies(SAMPLE_JD, [
      { label: "Roadmap", jd_quote: "own the roadmap for a checkout feature" },
      ...fabricated.competencies.slice(0, 2),
    ]);
    expect(dropped).toBe(2);
    expect(kept).toHaveLength(1);
    expect(SAMPLE_JD.slice(kept[0].jdQuoteStart, kept[0].jdQuoteEnd)).toBe(kept[0].jdQuote);
    expect(kept[0].jdQuote).toBe("own the roadmap for a checkout feature");
  });

  it("drops duplicates of the same JD passage", () => {
    const { kept } = verifyCompetencies(SAMPLE_JD, [
      { label: "A", jd_quote: "Ship improvements every sprint" },
      { label: "B", jd_quote: "ship improvements every sprint" },
    ]);
    expect(kept).toHaveLength(1);
  });
});

describe("verifyQuestions", () => {
  const comps = verifyCompetencies(SAMPLE_JD, [
    { label: "Data decisions", jd_quote: "Use data to decide what to build next" },
    { label: "Ambiguity", jd_quote: "Handle ambiguity and change priorities" },
  ]).kept;

  it("drops case, guesstimate and technical questions (fit and behavioural only)", () => {
    const { kept, dropped } = verifyQuestions(SAMPLE_JD, comps, [
      { competency_label: "Data decisions", text: "Tell me about a time data changed what you built.", jd_quote: "Use data to decide what to build next" },
      { competency_label: "Data decisions", text: "Estimate the market size for checkout tools in India.", jd_quote: "Use data to decide what to build next" },
      { competency_label: "Ambiguity", text: "Walk me through how you would solve this case.", jd_quote: "Handle ambiguity and change priorities" },
    ]);
    expect(kept.map((q) => q.text)).toEqual(["Tell me about a time data changed what you built."]);
    expect(dropped).toBe(2);
  });

  it("drops questions whose JD quote or competency is not real", () => {
    const { kept } = verifyQuestions(SAMPLE_JD, comps, [
      { competency_label: "Data decisions", text: "Tell me about leading a large team.", jd_quote: "Lead a team of fifty" },
      { competency_label: "Not a competency", text: "Tell me about a hard trade-off.", jd_quote: "Use data to decide what to build next" },
    ]);
    expect(kept).toHaveLength(0);
  });
});

describe("createInterview", () => {
  it("creates an interview with 4–6 verified competencies and 3–5 questions (mock LLM)", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("h");
    const out = await createInterview({ repo, llm: createMockLlm() }, s.id, { jd: SAMPLE_JD, cv: null, interviewDate: "2026-12-01" });

    expect(out.competencies.length).toBeGreaterThanOrEqual(4);
    expect(out.competencies.length).toBeLessThanOrEqual(6);
    for (const c of out.competencies) expect(SAMPLE_JD.slice(c.jdQuoteStart, c.jdQuoteEnd)).toBe(c.jdQuote);
    expect(out.questions.length).toBeGreaterThanOrEqual(3);
    expect(out.questions.length).toBeLessThanOrEqual(5);
    for (const q of out.questions) expect(out.competencies.map((c) => c.id)).toContain(q.competencyId);

    const events = await repo.events.list({ sessionId: s.id, name: "interview_added" });
    expect(events[0].props).toMatchObject({ has_date: true, has_cv: false });
    expect((await repo.aiCalls.list({ sessionId: s.id })).map((c) => c.purpose)).toEqual(["competencies", "questions"]);
  });

  it("retries once when the model invents JD quotes, then succeeds", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("h");
    const good = (await createMockLlm().run("competencies", { jd: SAMPLE_JD })).data;
    const llm = scriptedLlm({ competencies: [fabricated, good] });
    const out = await createInterview({ repo, llm }, s.id, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    expect(out.competencies.length).toBeGreaterThanOrEqual(4);
    expect(out.droppedQuotes).toBe(4);
  });

  it("fails cleanly and stores nothing when the model keeps inventing quotes", async () => {
    const repo = createMemoryRepo();
    const s = await repo.sessions.create("h");
    const llm = scriptedLlm({ competencies: [fabricated] });
    await expect(createInterview({ repo, llm }, s.id, { jd: SAMPLE_JD, cv: null, interviewDate: null })).rejects.toBeInstanceOf(InterviewGenerationError);
    expect(await repo.interviews.listBySession(s.id)).toEqual([]);
  });
});
