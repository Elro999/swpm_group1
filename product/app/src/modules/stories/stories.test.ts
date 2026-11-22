import { beforeEach, describe, expect, it } from "vitest";
import type { LlmTask, LlmTaskMap } from "@/lib/contracts";
import { createMemoryRepo } from "@/lib/db/memory";
import type { Repo } from "@/lib/db/types";
import { createMockLlm } from "@/modules/ai/mock/llm";
import type { LlmProvider, LlmResult } from "@/modules/ai/types";
import { createInterview } from "@/modules/interview/service";
import { SAMPLE_JD, SAMPLE_STORY } from "@/test/fixtures";
import { findInventions } from "./guard";
import { addStory, deleteStory, mapStories, StoryError, updateStory } from "./service";
import { missingParts, starGroups, storyName } from "./star";
import { structureStar } from "./structure";

function scripted<K extends LlmTask>(task: K, outputs: LlmTaskMap[K]["output"][]): LlmProvider {
  const real = createMockLlm();
  let i = 0;
  return {
    name: "scripted",
    async run<T extends LlmTask>(t: T, input: LlmTaskMap[T]["input"]): Promise<LlmResult<T>> {
      if ((t as string) !== task) return real.run(t, input);
      const data = outputs[Math.min(i++, outputs.length - 1)] as unknown as LlmTaskMap[T]["output"];
      return { data, model: "scripted", usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
}

describe("G-NO-INVENT guard (SB5, G5)", () => {
  const source = "We were losing small customers. I decided to interview twelve of them. Churn fell by 18% in one quarter.";

  it("passes text made only of the user's own words", () => {
    expect(findInventions("I decided to interview twelve of them. Churn fell by 18%", source)).toEqual([]);
  });

  it("catches invented numbers, names and ownership verbs", () => {
    const found = findInventions("I led the project at Google and increased revenue 20%.", source);
    expect(found).toEqual(expect.arrayContaining([
      { kind: "number", token: "20%" },
      { kind: "name", token: "Google" },
      { kind: "ownership", token: "led" },
    ]));
  });

  it("does not treat a capital at the start of a sentence, or 'I', as a name", () => {
    expect(findInventions("Churn fell. I decided.", source)).toEqual([]);
  });
});

const CHECKOUT =
  "Our checkout lost small merchants every month. My goal was to cut drop-off before the next quarter. I decided to interview twelve merchants myself and turned insights into requirements. Drop-off fell by 18%.";

describe("structureStar: STAR from the user's own sentences", () => {
  const src = "We were losing small customers. My goal was to find out why. I interviewed twelve of them. Churn fell by 18% in one quarter.";
  const at = (text: string, part: "situation" | "task" | "action" | "result", actor: "own" | "team" | "unclear" = "unclear") => ({
    text, start: src.indexOf(text), end: src.indexOf(text) + text.length, part, actor,
  });

  it("uses the model's labels only where its sentence is really in the text, and computes flags in code", () => {
    const out = structureStar(src, { sentences: [
      at("We were losing small customers.", "situation", "team"),
      at("My goal was to find out why.", "task", "own"),
      at("I interviewed twelve of them.", "action", "own"),
      at("Churn fell by 18% in one quarter.", "result"),
    ] });
    expect(out.dropped).toBe(0);
    expect(out.missing).toEqual([]);
    expect(out.state).toBe("structured");
    expect(out.sentences.map((s) => s.part)).toEqual(["situation", "task", "action", "result"]);
    for (const s of out.sentences) expect(s.flags).toEqual([]); // "we" outside Action is not flagged
  });

  it("drops invented sentences, re-finds ones with wrong offsets, and never loses a sentence", () => {
    const out = structureStar(src, { sentences: [
      { text: "I single-handedly saved the company.", start: 0, end: 10, part: "result", actor: "own" },
      { ...at("I interviewed twelve of them.", "action", "own"), start: 0, end: 5 },
    ] });
    expect(out.dropped).toBe(1);
    expect(out.sentences).toHaveLength(4); // every sentence is kept
    // Unlabelled sentences follow the part before them; the first defaults to Situation.
    expect(out.sentences.map((s) => s.part)).toEqual(["situation", "situation", "action", "action"]);
    expect(out.missing).toEqual(["task", "result"]);
    expect(out.state).toBe("draft");
  });

  it("flags 'we' only in Action and unsupported claims only in Result", () => {
    const text = "Sales were flat. The task was to grow them. We redesigned the page. Sales improved a lot.";
    const s = (t: string, part: "situation" | "task" | "action" | "result") => ({ text: t, start: text.indexOf(t), end: text.indexOf(t) + t.length, part, actor: "unclear" as const });
    const out = structureStar(text, { sentences: [s("Sales were flat.", "situation"), s("The task was to grow them.", "task"), s("We redesigned the page.", "action"), s("Sales improved a lot.", "result")] });
    expect(out.sentences[2].flags).toEqual(["we"]);
    expect(out.sentences[3].flags).toEqual(["no_evidence"]);
  });
});

describe("story service", () => {
  let repo: Repo;
  let sessionId: string;
  beforeEach(async () => {
    repo = createMemoryRepo();
    sessionId = (await repo.sessions.create("h")).id;
  });

  it("saves ONE story with its title, sorted into STAR, nothing invented", async () => {
    const s = await addStory({ repo, llm: createMockLlm() }, sessionId, { title: "  Churn   study ", text: SAMPLE_STORY });
    expect(s.title).toBe("Churn study");
    expect(s.format).toBe("star");
    expect(s.rawText).toBe(SAMPLE_STORY);
    const g = starGroups(s);
    expect(g.situation[0].text).toBe("At my last company we were losing small customers after the first month.");
    expect(g.task[0].text).toBe("My goal was to find out why within one quarter.");
    expect(g.action[0].text).toMatch(/^I interviewed twelve/);
    expect(g.result[0].text).toBe("Churn fell by 18% in one quarter.");
    expect(s.state).toBe("structured");
    expect((await repo.events.list({ sessionId, name: "story_added" }))[0].props).toMatchObject({ count: 1 });
  });

  it("keeps a blank-line paste as one story (no splitting)", async () => {
    const s = await addStory({ repo, llm: createMockLlm() }, sessionId, { title: "Two parts", text: `${SAMPLE_STORY}\n\nAnd one more thing I did later on.` });
    expect(await repo.stories.listBySession(sessionId)).toHaveLength(1);
    expect(s.rawText).toContain("one more thing");
  });

  it("needs a title (max 80 characters) and 40+ characters of story, with clear messages", async () => {
    const llm = createMockLlm();
    await expect(addStory({ repo, llm }, sessionId, { title: "", text: SAMPLE_STORY })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/title/) });
    await expect(addStory({ repo, llm }, sessionId, { title: "x".repeat(81), text: SAMPLE_STORY })).rejects.toMatchObject({ status: 400 });
    await expect(addStory({ repo, llm }, sessionId, { title: "Short", text: "Too short." })).rejects.toMatchObject({ status: 400 });
    await expect(addStory({ repo, llm }, sessionId, { title: "Long", text: "x ".repeat(10_001) })).rejects.toBeInstanceOf(StoryError);
  });

  it("discovery drafts need no title and are named by their first words", async () => {
    const s = await addStory({ repo, llm: createMockLlm() }, sessionId, { text: SAMPLE_STORY }, "discovery");
    expect(s.title).toBeNull();
    expect(storyName(s)).toBe("At my last company we were losing small…");
  });

  it("marks ready, renames, and editing the text re-sorts it and clears ready (4.5)", async () => {
    const llm = createMockLlm();
    const s = await addStory({ repo, llm }, sessionId, { title: "Churn", text: SAMPLE_STORY });
    expect((await updateStory({ repo, llm }, sessionId, s.id, { ready: true })).state).toBe("ready");
    expect(await repo.events.list({ sessionId, name: "story_marked_ready" })).toHaveLength(1);

    const renamed = await updateStory({ repo, llm }, sessionId, s.id, { title: "Churn interviews" });
    expect(renamed.title).toBe("Churn interviews");
    expect(renamed.state).toBe("ready"); // renaming does not touch the story

    const edited = await updateStory({ repo, llm }, sessionId, s.id, {
      rawText: "Our app was slow. My task was to speed up search. I chose to cache the search queries. Load time dropped by 40%.",
    });
    expect(edited.state).toBe("structured");
    expect(starGroups(edited).action[0].text).toBe("I chose to cache the search queries.");
  });

  it("will not mark a story ready until it has all four STAR parts, and says which are missing", async () => {
    const llm = createMockLlm();
    const s = await addStory({ repo, llm }, sessionId, { title: "No task", text: "Our checkout lost small merchants every month. I interviewed twelve merchants myself. Drop-off fell by 18%." });
    expect(missingParts(s)).toEqual(["task"]);
    expect(s.state).toBe("draft");
    await expect(updateStory({ repo, llm }, sessionId, s.id, { ready: true })).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/missing Task/) });
  });

  it("deletes a story (owner only), and its matches go with it", async () => {
    const llm = createMockLlm();
    const { interview } = await createInterview({ repo, llm }, sessionId, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    const s = await addStory({ repo, llm }, sessionId, { title: "Checkout", text: CHECKOUT });
    const mapped = (await mapStories({ repo, llm }, sessionId, interview.id)).filter((r) => !r.isGap);
    expect(mapped.length).toBeGreaterThan(0);

    const other = (await repo.sessions.create("o")).id;
    await expect(deleteStory({ repo, llm }, other, s.id)).rejects.toMatchObject({ status: 404 });

    await deleteStory({ repo, llm }, sessionId, s.id);
    expect(await repo.stories.listBySession(sessionId)).toHaveLength(0);
    expect(await repo.competencyMap.listByCompetencies(mapped.map((r) => r.competencyId))).toEqual([]);
    expect(await repo.events.list({ sessionId, name: "story_deleted" })).toHaveLength(1);
    await expect(deleteStory({ repo, llm }, sessionId, s.id)).rejects.toMatchObject({ status: 404 });
  });

  it("only the owner can see or change a story", async () => {
    const s = await addStory({ repo, llm: createMockLlm() }, sessionId, { title: "Churn", text: SAMPLE_STORY });
    const other = (await repo.sessions.create("o")).id;
    await expect(updateStory({ repo, llm: createMockLlm() }, other, s.id, { ready: true })).rejects.toMatchObject({ status: 404 });
  });
});

describe("mapStories: every competency gets a story or a gap (SB4, G3)", () => {
  async function setup(llm: LlmProvider = createMockLlm()) {
    const repo = createMemoryRepo();
    const sessionId = (await repo.sessions.create("h")).id;
    const { interview, competencies } = await createInterview({ repo, llm: createMockLlm() }, sessionId, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    return { repo, llm, sessionId, interview, competencies };
  }

  it("with no stories, every competency is a gap", async () => {
    const { repo, llm, sessionId, interview, competencies } = await setup();
    const rows = await mapStories({ repo, llm }, sessionId, interview.id);
    expect(rows).toHaveLength(competencies.length);
    expect(rows.every((r) => r.isGap && r.storyId === null)).toBe(true);
  });

  it("maps where a story fits, with a verbatim reason, and fills the rest with gaps", async () => {
    const { repo, llm, sessionId, interview, competencies } = await setup();
    const story = await addStory({ repo, llm }, sessionId, { title: "Checkout", text: CHECKOUT });
    const rows = await mapStories({ repo, llm }, sessionId, interview.id);
    expect(rows).toHaveLength(competencies.length);
    const mapped = rows.filter((r) => !r.isGap);
    expect(mapped.length).toBeGreaterThanOrEqual(1);
    for (const r of mapped) expect(story.rawText).toContain(r.rationaleQuote!);
  });

  it("turns an invented reason, an unknown story id or another user's story into a gap", async () => {
    const base = await setup();
    const story = await addStory({ repo: base.repo, llm: base.llm }, base.sessionId, { title: "Churn", text: SAMPLE_STORY });
    const labels = base.competencies.map((c) => c.label);
    const llm = scripted("story_map", [{ mappings: [
      { competency_label: labels[0], story_id: story.id, rationale_quote: "I single-handedly saved the company" },
      { competency_label: labels[1], story_id: "not-a-real-id", rationale_quote: "I decided to interview twelve of them myself" },
    ] }]);
    const rows = await mapStories({ repo: base.repo, llm }, base.sessionId, base.interview.id);
    expect(rows.every((r) => r.isGap)).toBe(true);
  });
});

describe("review fixes: no stale evidence", () => {
  it("editing a mapped story turns its mappings into gaps until matching runs again", async () => {
    const repo = createMemoryRepo();
    const llm = createMockLlm();
    const sessionId = (await repo.sessions.create("h")).id;
    const { interview } = await createInterview({ repo, llm }, sessionId, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    const story = await addStory({ repo, llm }, sessionId, { title: "Checkout", text: CHECKOUT });
    const before = await mapStories({ repo, llm }, sessionId, interview.id);
    const ids = before.filter((r) => !r.isGap).map((r) => r.competencyId);
    expect(ids.length).toBeGreaterThan(0);
    await updateStory({ repo, llm }, sessionId, story.id, { rawText: "At a hackathon I chose to build a small bot for reminders and it won second place overall." });
    const after = await repo.competencyMap.listByCompetencies(ids);
    expect(after.every((r) => r.isGap && r.storyId === null && r.rationaleQuote === null)).toBe(true);
  });
});
