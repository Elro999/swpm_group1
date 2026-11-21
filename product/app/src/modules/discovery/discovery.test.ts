import { beforeEach, describe, expect, it } from "vitest";
import type { LlmTask, LlmTaskMap } from "@/lib/contracts";
import { createMemoryRepo } from "@/lib/db/memory";
import type { CompetencyRow, InterviewRow, Repo } from "@/lib/db/types";
import { createMockLlm } from "@/modules/ai/mock/llm";
import type { LlmProvider, LlmResult } from "@/modules/ai/types";
import { createInterview } from "@/modules/interview/service";
import { mapStories } from "@/modules/stories/service";
import { SAMPLE_CV, SAMPLE_JD } from "@/test/fixtures";
import { DiscoveryError, draftStoryFromAnswer, fallbackPrompts, gapPrompts, saveCv, verifyPrompts } from "./service";

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
    expect(ps.length).toBeGreaterThanOrEqual(3);
    for (const p of ps) for (const r of p.references) expect(SAMPLE_CV).toContain(r);
  });
});

describe("gap discovery service", () => {
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

  it("asks for a CV before prompting, and validates it", async () => {
    await expect(gapPrompts({ repo, llm: createMockLlm() }, sessionId, competency.id)).rejects.toMatchObject({ status: 409 });
    await expect(saveCv({ repo }, sessionId, interview.id, "short")).rejects.toBeInstanceOf(DiscoveryError);
    const saved = await saveCv({ repo }, sessionId, interview.id, `  ${SAMPLE_CV}  `);
    expect(saved.cvText).toBe(SAMPLE_CV);
  });

  it("returns 3–5 prompts that reference real CV lines (mock model)", async () => {
    await saveCv({ repo }, sessionId, interview.id, SAMPLE_CV);
    const prompts = await gapPrompts({ repo, llm: createMockLlm() }, sessionId, competency.id);
    expect(prompts.length).toBeGreaterThanOrEqual(3);
    expect(prompts.length).toBeLessThanOrEqual(5);
    for (const p of prompts) for (const r of p.references) expect(SAMPLE_CV).toContain(r);
  });

  it("falls back to CV-based prompts when the model keeps inventing", async () => {
    await saveCv({ repo }, sessionId, interview.id, SAMPLE_CV);
    const llm = scriptedPrompts([{ prompts: [
      { text: "At Google, what did you decide?", references: ["Google, 2019"] },
      { text: "At Meta, what did you decide?", references: ["Meta"] },
      { text: "At Netflix, what did you decide?", references: ["Netflix"] },
    ] }]);
    const prompts = await gapPrompts({ repo, llm }, sessionId, competency.id);
    expect(prompts.length).toBeGreaterThanOrEqual(3);
    for (const p of prompts) {
      expect(p.text).not.toMatch(/Google|Meta|Netflix/);
      for (const r of p.references) expect(SAMPLE_CV).toContain(r);
    }
    expect((await repo.aiCalls.list({ sessionId })).filter((c) => c.purpose === "gap_prompts")).toHaveLength(2); // one retry
  });

  it("turns an answer into a draft story in the user's words and fills the gap (SD2)", async () => {
    await mapStories({ repo, llm: createMockLlm() }, sessionId, interview.id); // everything is a gap
    const answer = "The pricing experiment hit a supplier delay. I decided to move the test to 20 different stores. We still finished on time.";
    const { story, mapping } = await draftStoryFromAnswer({ repo, llm: createMockLlm() }, sessionId, competency.id, answer);

    expect(story.source).toBe("discovery");
    expect(answer).toContain(story.rawText);
    expect(mapping).toMatchObject({ competencyId: competency.id, storyId: story.id, isGap: false });
    expect(answer).toContain(mapping.rationaleQuote!);
    const [row] = await repo.competencyMap.listByCompetencies([competency.id]);
    expect(row.isGap).toBe(false);
    expect(await repo.events.list({ sessionId, name: "gap_story_filled" })).toHaveLength(1);
  });

  it("only the owner can prompt, save a CV, or fill a gap", async () => {
    const other = (await repo.sessions.create("o")).id;
    await expect(gapPrompts({ repo, llm: createMockLlm() }, other, competency.id)).rejects.toMatchObject({ status: 404 });
    await expect(saveCv({ repo }, other, interview.id, SAMPLE_CV)).rejects.toMatchObject({ status: 404 });
    await expect(
      draftStoryFromAnswer({ repo, llm: createMockLlm() }, other, competency.id, "A long enough answer that would otherwise become a story."),
    ).rejects.toMatchObject({ status: 404 });
  });
});
