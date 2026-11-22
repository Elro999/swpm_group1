import { beforeEach, describe, expect, it } from "vitest";
import type { LlmTask, LlmTaskMap } from "@/lib/contracts";
import { createMemoryRepo } from "@/lib/db/memory";
import type { CompetencyRow, InterviewRow, Repo } from "@/lib/db/types";
import { createMockLlm } from "@/modules/ai/mock/llm";
import type { LlmProvider, LlmResult } from "@/modules/ai/types";
import { createInterview } from "@/modules/interview/service";
import { SAMPLE_CV, SAMPLE_JD } from "@/test/fixtures";
import { DiscoveryError, ensureCardPrompts, fallbackPrompts, loadBuildContext, saveCv, verifyPrompts } from "./service";

function scriptedPrompts(outputs: LlmTaskMap["gap_prompts"]["output"][]): LlmProvider {
  const real = createMockLlm();
  let i = 0;
  return {
    name: "scripted",
    async run<T extends LlmTask>(t: T, input: LlmTaskMap[T]["input"]): Promise<LlmResult<T>> {
      if (t !== "gap_prompts") return real.run(t, input);
      const data = outputs[Math.min(i++, outputs.length - 1)] as unknown as LlmTaskMap[T]["output"];
      return { data, model: "scripted", usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
}

describe("verifyPrompts (SD1: prompts must point at the user's own CV)", () => {
  const ctx = "Handling ambiguity";
  it("keeps questions whose references are real CV lines", () => {
    const kept = verifyPrompts(SAMPLE_CV, ctx, [{ text: 'In "Led a pricing experiment across 40 stores", what did you decide?', references: ["Led a pricing experiment across 40 stores"] }]);
    expect(kept).toHaveLength(1);
  });
  it("drops prompts with invented references, invented numbers or names, or that are not questions", () => {
    const kept = verifyPrompts(SAMPLE_CV, ctx, [
      { text: "At Amazon, what did you decide?", references: ["Senior manager at Amazon"] }, // reference not in CV
      { text: 'In "Built a weekly sales dashboard", how did 300 managers react?', references: ["Built a weekly sales dashboard"] }, // invented number
      { text: 'Tell me about "Built a weekly sales dashboard".', references: ["Built a weekly sales dashboard"] }, // not a question
      { text: "What did you decide?", references: [] }, // no reference at all
    ]);
    expect(kept).toEqual([]);
  });
  it("fallback prompts are built from CV lines, verbatim", () => {
    const ps = fallbackPrompts(SAMPLE_CV, "Handling ambiguity");
    expect(ps.length).toBeGreaterThanOrEqual(2);
    for (const p of ps) for (const r of p.references) expect(SAMPLE_CV).toContain(r);
  });
});

describe("card prompts and Build story context (SD1, design/01)", () => {
  let repo: Repo;
  let sessionId: string;
  let interview: InterviewRow;
  let competency: CompetencyRow;

  beforeEach(async () => {
    repo = createMemoryRepo();
    sessionId = (await repo.sessions.create("h")).id;
    const created = await createInterview({ repo, llm: createMockLlm() }, sessionId, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    interview = created.interview;
    competency = created.competencies[0];
  });

  const asked = async () => {
    const qs = await repo.questions.listByInterview(interview.id);
    return [...new Set(qs.map((q) => q.competencyId).filter((x): x is string => Boolean(x)))];
  };

  it("makes no prompts (and no AI call) without a CV, and validates a CV", async () => {
    const before = (await repo.aiCalls.list({ sessionId })).length;
    expect(await ensureCardPrompts({ repo, llm: createMockLlm() }, sessionId, interview.id)).toBe(0);
    expect(await repo.aiCalls.list({ sessionId })).toHaveLength(before);
    await expect(saveCv({ repo }, sessionId, interview.id, "short")).rejects.toBeInstanceOf(DiscoveryError);
    const saved = await saveCv({ repo }, sessionId, interview.id, `  ${SAMPLE_CV}  `);
    expect(saved.cvText).toBe(SAMPLE_CV);
  });

  it("saves 2–4 prompts per question's competency, quoting real CV lines, once", async () => {
    await saveCv({ repo }, sessionId, interview.id, SAMPLE_CV);
    const ids = await asked();
    expect(await ensureCardPrompts({ repo, llm: createMockLlm() }, sessionId, interview.id)).toBe(ids.length);
    const prompts = await repo.competencyPrompts.listByCompetencies(ids);
    for (const id of ids) {
      const mine = prompts.filter((p) => p.competencyId === id);
      expect(mine.length).toBeGreaterThanOrEqual(2);
      expect(mine.length).toBeLessThanOrEqual(4);
      for (const p of mine) for (const r of p.refs) expect(SAMPLE_CV).toContain(r);
    }
    const calls = (await repo.aiCalls.list({ sessionId })).length;
    expect(await ensureCardPrompts({ repo, llm: createMockLlm() }, sessionId, interview.id)).toBe(0); // cached
    expect(await repo.aiCalls.list({ sessionId })).toHaveLength(calls);
  });

  it("drops invented prompts and tops up from CV lines", async () => {
    await saveCv({ repo }, sessionId, interview.id, SAMPLE_CV);
    const llm = scriptedPrompts([{ prompts: [
      { text: "At Google, what did you decide?", references: ["Google, 2019"] },
      { text: "At Meta, what did you decide?", references: ["Meta"] },
      { text: "At Netflix, what did you decide?", references: ["Netflix"] },
    ] }]);
    await ensureCardPrompts({ repo, llm }, sessionId, interview.id);
    const prompts = await repo.competencyPrompts.listByCompetencies(await asked());
    expect(prompts.length).toBeGreaterThan(0);
    for (const p of prompts) {
      expect(p.text).not.toMatch(/Google|Meta|Netflix/);
      for (const r of p.refs) expect(SAMPLE_CV).toContain(r);
    }
  });

  it("a new CV clears the saved prompts so they are made again", async () => {
    await saveCv({ repo }, sessionId, interview.id, SAMPLE_CV);
    await ensureCardPrompts({ repo, llm: createMockLlm() }, sessionId, interview.id);
    await saveCv({ repo }, sessionId, interview.id, "Ran the campus fundraising event for two years with a team of ten.");
    expect(await repo.competencyPrompts.listByCompetencies(await asked())).toHaveLength(0);
  });

  it("Build story context is looked up from IDs, for the owner only", async () => {
    await saveCv({ repo }, sessionId, interview.id, SAMPLE_CV);
    await ensureCardPrompts({ repo, llm: createMockLlm() }, sessionId, interview.id);
    const q = (await repo.questions.listByInterview(interview.id))[0];
    const [prompt] = await repo.competencyPrompts.listByCompetencies([q.competencyId!]);
    const ctx = await loadBuildContext({ repo }, sessionId, { interviewId: interview.id, questionId: q.id, promptId: prompt.id });
    expect(ctx).toMatchObject({ questionNo: 1, questionText: q.text, competencyId: q.competencyId, prompt: { id: prompt.id, cvLine: prompt.refs[0] } });

    const other = (await repo.sessions.create("o")).id;
    expect(await loadBuildContext({ repo }, other, { interviewId: interview.id, questionId: q.id, promptId: prompt.id })).toBeNull();
    await expect(ensureCardPrompts({ repo, llm: createMockLlm() }, other, interview.id)).rejects.toMatchObject({ status: 404 });
    await expect(saveCv({ repo }, other, interview.id, SAMPLE_CV)).rejects.toMatchObject({ status: 404 });
    // A prompt from another competency is ignored.
    const q2 = (await repo.questions.listByInterview(interview.id)).find((x) => x.competencyId !== q.competencyId)!;
    expect((await loadBuildContext({ repo }, sessionId, { interviewId: interview.id, questionId: q2.id, promptId: prompt.id }))?.prompt).toBeNull();
    void competency;
  });
});
