import { beforeEach, describe, expect, it } from "vitest";
import type { LlmTask, LlmTaskMap } from "@/lib/contracts";
import { createMemoryRepo } from "@/lib/db/memory";
import type { Repo } from "@/lib/db/types";
import { createMockLlm } from "@/modules/ai/mock/llm";
import type { LlmProvider, LlmResult } from "@/modules/ai/types";
import { createInterview } from "@/modules/interview/service";
import { SAMPLE_JD, SAMPLE_STORIES } from "@/test/fixtures";
import { findInventions } from "./guard";
import { addStories, mapStories, StoryError, updateStory } from "./service";
import { structureFromModel } from "./structure";

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

describe("structureFromModel: verbatim spans only", () => {
  it("keeps verified spans, rebases them into each story, and computes flags in code", () => {
    const out = { stories: [
      {
        situation: { text: "We were losing small customers.", start: 0, end: 31 },
        decision: { text: "I decided to interview twelve of them.", start: 32, end: 70 },
        result: { text: "Churn fell by 18% in one quarter.", start: 71, end: 104 },
        sentences: [],
      },
    ] };
    const src = "We were losing small customers. I decided to interview twelve of them. Churn fell by 18% in one quarter.";
    const { stories, dropped } = structureFromModel(src, out);
    expect(dropped).toBe(0);
    const s = stories[0];
    expect(s.rawText.slice(s.decision!.start, s.decision!.end)).toBe(s.decision!.text);
    expect(s.state).toBe("structured");
    expect(s.sentences[0]).toMatchObject({ actor: "team", flags: ["we"] });
    expect(s.sentences[1].actor).toBe("own");
    expect(s.sentences[2].flags).toEqual([]); // has a number: evidence present
  });

  it("drops a field whose text is not in the source (invented), and recovers offsets that were merely wrong", () => {
    const src = "In college the team could not agree. I chose to run a quick vote. We moved on.";
    const { stories, dropped } = structureFromModel(src, { stories: [
      {
        situation: { text: "In college the team could not agree.", start: 5, end: 9 }, // wrong offsets, real text
        decision: { text: "I personally led a 20-person vote at Microsoft.", start: 37, end: 64 }, // invented
        result: null,
        sentences: [],
      },
    ] });
    expect(dropped).toBe(1);
    expect(stories[0].situation?.text).toBe("In college the team could not agree.");
    expect(stories[0].decision).toBeNull();
  });

  it("flags unsupported claims (a result word without any number)", () => {
    const src = "I improved the onboarding a lot.";
    const { stories } = structureFromModel(src, { stories: [{ situation: { text: src, start: 0, end: src.length }, decision: null, result: null, sentences: [] }] });
    expect(stories[0].sentences[0].flags).toContain("no_evidence");
  });

  it("falls back to one draft story when the model returns nothing usable", () => {
    const src = "Some notes I wrote about a project.";
    const { stories } = structureFromModel(src, { stories: [{ situation: { text: "Not in the text at all", start: 0, end: 5 }, decision: null, result: null, sentences: [] }] });
    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({ rawText: src, state: "draft", decision: null });
  });
});

describe("story service", () => {
  let repo: Repo;
  let sessionId: string;
  beforeEach(async () => {
    repo = createMemoryRepo();
    sessionId = (await repo.sessions.create("h")).id;
  });

  it("splits pasted text into stories, decision first, nothing invented", async () => {
    const stories = await addStories({ repo, llm: createMockLlm() }, sessionId, SAMPLE_STORIES);
    expect(stories).toHaveLength(2);
    for (const s of stories) {
      expect(SAMPLE_STORIES).toContain(s.rawText);
      for (const f of [s.situation, s.decision, s.result]) if (f) expect(s.rawText.slice(f.start, f.end)).toBe(f.text);
    }
    expect(stories[0].decision?.text).toMatch(/^I decided/);
    expect((await repo.events.list({ sessionId, name: "story_added" }))[0].props).toMatchObject({ count: 2 });
  });

  it("rejects text that is too short or too long, with a clear message", async () => {
    await expect(addStories({ repo, llm: createMockLlm() }, sessionId, "Too short.")).rejects.toMatchObject({ status: 400 });
    await expect(addStories({ repo, llm: createMockLlm() }, sessionId, "x ".repeat(10_001))).rejects.toBeInstanceOf(StoryError);
  });

  it("marks ready, and editing the text re-structures and clears ready (4.5)", async () => {
    const [s] = await addStories({ repo, llm: createMockLlm() }, sessionId, SAMPLE_STORIES);
    const ready = await updateStory({ repo, llm: createMockLlm() }, sessionId, s.id, { ready: true });
    expect(ready.state).toBe("ready");
    expect(await repo.events.list({ sessionId, name: "story_marked_ready" })).toHaveLength(1);

    const edited = await updateStory({ repo, llm: createMockLlm() }, sessionId, s.id, {
      rawText: "Our app was slow. I chose to cache the search results. Load time dropped by 40%.",
    });
    expect(edited.state).toBe("structured");
    expect(edited.decision?.text).toBe("I chose to cache the search results.");
  });

  it("will not mark a story ready when no structure was found", async () => {
    const llm = scripted("story_structure", [{ stories: [{ situation: { text: "nope", start: 0, end: 4 }, decision: null, result: null, sentences: [] }] }]);
    const [s] = await addStories({ repo, llm }, sessionId, "Notes without anything the model could find a story in at all.");
    expect(s.state).toBe("draft");
    await expect(updateStory({ repo, llm }, sessionId, s.id, { ready: true })).rejects.toMatchObject({ status: 409 });
  });

  it("only the owner can see or change a story", async () => {
    const [s] = await addStories({ repo, llm: createMockLlm() }, sessionId, SAMPLE_STORIES);
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
    const stories = await addStories({ repo, llm }, sessionId, "Our checkout lost small merchants. I decided to interview twelve merchants myself and turned insights into requirements. Drop-off fell by 18%.");
    const rows = await mapStories({ repo, llm }, sessionId, interview.id);
    expect(rows).toHaveLength(competencies.length);
    const mapped = rows.filter((r) => !r.isGap);
    expect(mapped.length).toBeGreaterThanOrEqual(1);
    for (const r of mapped) expect(stories[0].rawText).toContain(r.rationaleQuote!);
  });

  it("turns an invented reason, an unknown story id or another user's story into a gap", async () => {
    const base = await setup();
    const [story] = await addStories({ repo: base.repo, llm: base.llm }, base.sessionId, SAMPLE_STORIES);
    const labels = base.competencies.map((c) => c.label);
    const llm = scripted("story_map", [{ mappings: [
      { competency_label: labels[0], story_id: story.id, rationale_quote: "I single-handedly saved the company" },
      { competency_label: labels[1], story_id: "not-a-real-id", rationale_quote: "I decided to interview twelve of them myself" },
    ] }]);
    const rows = await mapStories({ repo: base.repo, llm }, base.sessionId, base.interview.id);
    expect(rows.every((r) => r.isGap)).toBe(true);
  });
});

describe("review fixes: no lost text, no stale evidence", () => {
  const words = (t: string) => t.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const span = (src: string, text: string) => ({ text, start: src.indexOf(text), end: src.indexOf(text) + text.length });

  it("keeps text outside the model's spans as a draft story (the reviewer's 84-of-160 probe)", () => {
    const src =
      "First I ran a survey of forty users about onboarding. I decided to cut the signup form to one step. Signups rose by 12%. Later I also mentored two juniors on testing.";
    const decision = "I decided to cut the signup form to one step.";
    const { stories } = structureFromModel(src, { stories: [{ situation: span(src, decision), decision: span(src, decision), result: null, sentences: [] }] });
    const kept = stories.map((s) => s.rawText).join(" ");
    for (const w of words(src)) expect(kept).toContain(w);
    expect(stories.some((s) => s.state === "structured" && s.rawText.includes(decision))).toBe(true);
    expect(stories.filter((s) => s.state === "draft").map((s) => s.rawText)).toEqual([
      "First I ran a survey of forty users about onboarding.",
      "Signups rose by 12%. Later I also mentored two juniors on testing.",
    ]);
  });

  it("attaches a tiny leftover such as a heading to the next story instead of dropping it", () => {
    const src = "Story one: I decided to rebuild the pricing page myself. Conversions went up by 9%.";
    const decision = "I decided to rebuild the pricing page myself.";
    const { stories } = structureFromModel(src, { stories: [{ situation: span(src, decision), decision: span(src, decision), result: null, sentences: [] }] });
    const kept = stories.map((s) => s.rawText).join(" ");
    for (const w of words(src)) expect(kept).toContain(w);
    const main = stories.find((s) => s.state === "structured")!;
    expect(main.rawText.startsWith("Story one:")).toBe(true);
    expect(main.rawText.slice(main.decision!.start, main.decision!.end)).toBe(decision);
  });

  it("editing a mapped story turns its mappings into gaps until matching runs again", async () => {
    const repo = createMemoryRepo();
    const llm = createMockLlm();
    const sessionId = (await repo.sessions.create("h")).id;
    const { interview } = await createInterview({ repo, llm }, sessionId, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    const [story] = await addStories({ repo, llm }, sessionId, "Our checkout lost small merchants. I decided to interview twelve merchants myself and turned insights into requirements. Drop-off fell by 18%.");
    const before = await mapStories({ repo, llm }, sessionId, interview.id);
    const ids = before.filter((r) => !r.isGap).map((r) => r.competencyId);
    expect(ids.length).toBeGreaterThan(0);
    await updateStory({ repo, llm }, sessionId, story.id, { rawText: "At a hackathon I chose to build a small bot for reminders and it won second place overall." });
    const after = await repo.competencyMap.listByCompetencies(ids);
    expect(after.every((r) => r.isGap && r.storyId === null && r.rationaleQuote === null)).toBe(true);
  });
});
