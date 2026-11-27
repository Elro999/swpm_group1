import type { AttemptRow, QuestionRow, Repo, SessionRow, StoryRow } from "@/lib/db/types";
import { locateQuote } from "@/lib/text";
import type { LlmProvider } from "@/modules/ai/types";
import { recordEvent } from "@/modules/events/events";
import { buildCanonical } from "@/modules/feedback/transcript";
import { STORY_MIN_CHARS, TITLE_MAX_CHARS, updateStory } from "@/modules/stories/service";
import { mostSimilar } from "@/modules/stories/similar";
import { sentencesFromParts } from "@/modules/stories/structure";
import { STAR_PARTS } from "@/lib/db/types";
import { AttemptError, loadOwnedAttempt } from "./service";

/**
 * Practice answer → My stories (2026-11-27). A story told while practising is a story the user has, so it
 * should not be lost:
 * - after feedback, a NEW story (not similar to any in My stories) is saved automatically, in the user's exact
 *   words (the transcript), sorted into STAR with the labels already used for the feedback; nothing rewritten;
 * - a SIMILAR story is never saved twice on its own: the feedback screen asks to combine (add only the sentences
 *   the story does not have yet) or save as a new story;
 * - the story's title is the question (the user can rename it).
 */
type Deps = { repo: Repo; llm: LlmProvider };

export function titleFromQuestion(question: string): string {
  const q = question.replace(/\s+/g, " ").trim();
  if (q.length <= TITLE_MAX_CHARS) return q;
  const cut = q.slice(0, TITLE_MAX_CHARS - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).trimEnd()}…`;
}

/** The story a previous attempt at the same question was saved to; otherwise the most similar story by words. */
export async function findSimilarStory(repo: Repo, sessionId: string, attempt: AttemptRow): Promise<StoryRow | null> {
  if (!attempt.answerText) return null;
  const stories = await repo.stories.listBySession(sessionId);
  const byId = new Map(stories.map((s) => [s.id, s]));
  const earlier = (await repo.attempts.listByQuestion(attempt.questionId)).filter((a) => a.id !== attempt.id && a.storyId && byId.has(a.storyId));
  if (earlier.length) return byId.get(earlier.at(-1)!.storyId!)!;
  return mostSimilar(attempt.answerText, stories);
}

async function createFromAnswer(repo: Repo, sessionId: string, attempt: AttemptRow, question: QuestionRow): Promise<StoryRow | null> {
  if (!attempt.answerWords || !attempt.answerText || attempt.answerText.trim().length < STORY_MIN_CHARS) return null;
  const c = buildCanonical(attempt.answerWords);
  const parts = attempt.answerStar && attempt.answerStar.length === c.sentences.length ? attempt.answerStar : null;
  if (!parts) return null;
  const sentences = sentencesFromParts(c.text, c.sentences, parts);
  const missing = STAR_PARTS.filter((p) => !parts.includes(p));
  const story = await repo.stories.create({
    sessionId,
    source: "practice",
    rawText: c.text,
    title: titleFromQuestion(question.text),
    format: "star",
    state: missing.length ? "draft" : "structured",
    situation: null,
    decision: null,
    result: null,
    sentences,
  });
  await repo.attempts.update(attempt.id, { storyId: story.id });
  await recordEvent(repo, sessionId, "story_added", { count: 1, dropped_spans: 0, source: "practice" });
  return story;
}

/**
 * Called once feedback is saved. Best effort: a failure here never fails the attempt (feedback is the job).
 * Returns the new story, or null when it was not saved (too short, not sorted, or similar to an existing story).
 */
export async function autoSaveAnswerStory(repo: Repo, sessionId: string, attempt: AttemptRow, question: QuestionRow): Promise<StoryRow | null> {
  try {
    if (attempt.storyId) return null;
    if (await findSimilarStory(repo, sessionId, attempt)) return null;
    return await createFromAnswer(repo, sessionId, attempt, question);
  } catch (err) {
    console.error("auto-save of practice story failed", { name: (err as Error)?.name });
    return null;
  }
}

export type SaveChoice = { mode: "new" } | { mode: "combine"; storyId: string };

/** The user's choice on the feedback screen: save this answer as a new story, or combine it into an existing one. */
export async function saveAnswerStory(deps: Deps, session: SessionRow, attemptId: string, choice: SaveChoice): Promise<{ story: StoryRow; added: number }> {
  const owned = await loadOwnedAttempt(deps.repo, attemptId, session.id);
  if (!owned) throw new AttemptError(404, "That practice attempt was not found.");
  const { attempt, question } = owned;
  if (attempt.status !== "ready" || !attempt.answerWords) throw new AttemptError(409, "Feedback is not ready yet.");

  if (choice.mode === "new") {
    const existing = attempt.storyId ? await deps.repo.stories.findForSession(attempt.storyId, session.id) : null;
    if (existing) return { story: existing, added: 0 };
    const story = await createFromAnswer(deps.repo, session.id, attempt, question);
    if (!story) throw new AttemptError(409, "This answer is too short to save as a story.");
    return { story, added: story.sentences.length };
  }

  const target = await deps.repo.stories.findForSession(choice.storyId, session.id);
  if (!target) throw new AttemptError(404, "That story was not found.");
  // Add only the answer's sentences the story does not already contain, in the order they were said.
  const c = buildCanonical(attempt.answerWords);
  const fresh = c.sentences.map((s) => s.text).filter((t) => !locateQuote(target.rawText, t));
  let story = target;
  if (fresh.length) story = await updateStory(deps, session.id, target.id, { rawText: `${target.rawText.trimEnd()}\n\n${fresh.join(" ")}` });
  await deps.repo.attempts.update(attempt.id, { storyId: target.id });
  await recordEvent(deps.repo, session.id, "story_combined", { added_sentences: fresh.length });
  return { story, added: fresh.length };
}
