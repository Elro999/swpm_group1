import { describe, expect, it } from "vitest";
import { createMemoryAudioStore } from "@/lib/audio";
import { createMemoryRepo } from "@/lib/db/memory";
import type { Repo } from "@/lib/db/types";
import { createMockLlm } from "@/modules/ai/mock/llm";
import { createMockStt } from "@/modules/ai/mock/stt";
import { createInterview } from "@/modules/interview/service";
import { addStory, deleteStory } from "@/modules/stories/service";
import { SAMPLE_JD } from "@/test/fixtures";
import { skipFollowup, startAttempt, submitAnswerAudio, type AttemptDeps } from "./service";
import { saveAnswerStory, titleFromQuestion } from "./story";
import { buildAttemptView } from "./view";

const AUDIO = new Uint8Array([1, 2, 3, 4]);
const WEBM = "audio/webm;codecs=opus";

async function setup() {
  const repo: Repo = createMemoryRepo();
  const deps: AttemptDeps = { repo, llm: createMockLlm(), stt: createMockStt(), audio: createMemoryAudioStore() };
  let session = await repo.sessions.create("h");
  await repo.sessions.setConsent(session.id, new Date());
  session = (await repo.sessions.findByTokenHash("h"))!;
  const { questions } = await createInterview({ repo, llm: deps.llm }, session.id, { jd: SAMPLE_JD, cv: null, interviewDate: null });
  const practise = async (qid = questions[0].id) => {
    const a = await startAttempt(deps, session, qid);
    await submitAnswerAudio(deps, session, a.id, AUDIO, WEBM);
    return skipFollowup(deps, session, a.id);
  };
  return { repo, deps, session, questions, practise };
}

describe("practice answer → My stories", () => {
  it("sorts the answer into STAR and flags the missing part in feedback", async () => {
    const { repo, practise } = await setup();
    const a = await practise();
    expect(a.answerStar).toEqual(expect.arrayContaining(["situation", "action", "result"]));
    const fb = await repo.feedback.get(a.id);
    expect(fb.points.map((p) => p.checkId)).toContain("star_missing_task"); // the mock first answer has no Task
  });

  it("saves a new story automatically, in the user's exact words, titled with the question", async () => {
    const { repo, session, questions, practise } = await setup();
    const a = await practise();
    expect(a.storyId).toBeTruthy();
    const story = (await repo.stories.findForSession(a.storyId!, session.id))!;
    expect(story.source).toBe("practice");
    expect(story.rawText).toBe(a.answerText);
    expect(story.title).toBe(titleFromQuestion(questions[0].text));
    expect(story.state).toBe("draft"); // Task missing
    for (const s of story.sentences) expect(s.part).toBeTruthy();
    const view = await buildAttemptView(repo, (await repo.attempts.findById(a.id))!, questions[0], session.id);
    expect(view.story?.saved).toMatchObject({ id: story.id, missing: ["task"] });
    expect(view.star?.missing).toEqual(["task"]);
    const added = (await repo.events.list({ sessionId: session.id, name: "story_added" })).map((e) => e.props.source);
    expect(added).toEqual(["practice"]);
  });

  it("does not save a similar story twice: a retry is offered to combine", async () => {
    const { repo, deps, session, questions, practise } = await setup();
    const first = await practise();
    const retry = await practise();
    expect(retry.storyId).toBeNull();
    expect((await repo.stories.listBySession(session.id)).length).toBe(1);
    const view = await buildAttemptView(repo, (await repo.attempts.findById(retry.id))!, questions[0], session.id);
    expect(view.story).toMatchObject({ saved: null, similar: { id: first.storyId } });

    const { story, added } = await saveAnswerStory(deps, session, retry.id, { mode: "combine", storyId: first.storyId! });
    expect(added).toBeGreaterThan(0);
    // Only sentences the story lacked were added, verbatim; the old text is untouched.
    expect(story.rawText.startsWith((await repo.attempts.findById(first.id))!.answerText!)).toBe(true);
    expect(story.rawText).toContain("My task was to set the launch price within a month.");
    expect((await repo.attempts.findById(retry.id))!.storyId).toBe(first.storyId);
    // Combining again adds nothing new.
    expect((await saveAnswerStory(deps, session, retry.id, { mode: "combine", storyId: first.storyId! })).added).toBe(0);
  });

  it("a similar pasted story blocks auto-save; the user can still save as new", async () => {
    const { repo, deps, session, practise } = await setup();
    await addStory(deps, session.id, {
      title: "Pricing",
      text: "In my last role we were working on pricing for a new product line. The team ran several analyses with competitors and customers. I decided to recommend a lower entry price for the first quarter. Adoption went up in the pilot.",
    });
    const a = await practise();
    expect(a.storyId).toBeNull();
    const { story } = await saveAnswerStory(deps, session, a.id, { mode: "new" });
    expect(story.source).toBe("practice");
    expect((await repo.stories.listBySession(session.id)).length).toBe(2);
  });

  it("deleting the story clears the link; strangers get 404", async () => {
    const { repo, deps, session, practise } = await setup();
    const a = await practise();
    await deleteStory(deps, session.id, a.storyId!);
    expect((await repo.attempts.findById(a.id))!.storyId).toBeNull();
    const stranger = await repo.sessions.create("other");
    await expect(saveAnswerStory(deps, stranger, a.id, { mode: "new" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("STAR never blocks feedback", () => {
  it("feedback is still saved when storing the STAR labels fails", async () => {
    const { repo, practise } = await setup();
    const update = repo.attempts.update.bind(repo.attempts);
    repo.attempts.update = async (id, patch) => {
      if ("answerStar" in patch) throw new Error('column "answer_star" does not exist');
      return update(id, patch);
    };
    const a = await practise();
    expect(a.status).toBe("ready");
    const fb = await repo.feedback.get(a.id);
    expect(fb.points.length).toBeGreaterThan(0);
    expect(fb.points.map((p) => p.checkId)).toContain("star_missing_task"); // labels still used for this feedback
  });
});
