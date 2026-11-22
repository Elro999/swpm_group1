import type { CompetencyMapRow, Repo, StoryRow } from "@/lib/db/types";
import { locateQuote } from "@/lib/text";
import { withAiCall } from "@/modules/ai/log";
import type { LlmProvider } from "@/modules/ai/types";
import { recordEvent } from "@/modules/events/events";
import { missingParts, STAR_LABEL } from "./star";
import { structureStar } from "./structure";

/**
 * Story bank (SB1–SB5) and competency mapping (SB4, G3).
 * Stories are session-wide (not per interview), so one bank serves every role the user prepares for.
 * Since 2026-11-22 each save is ONE story, sorted into STAR (Situation, Task, Action, Result) using only
 * the user's own sentences, with a title the user chooses. Stories can be deleted.
 */
export const STORY_MIN_CHARS = 40;
export const STORY_MAX_CHARS = 20_000;
export const TITLE_MAX_CHARS = 80;

export class StoryError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 422, message: string) {
    super(message);
    this.name = "StoryError";
  }
}

interface Deps {
  repo: Repo;
  llm: LlmProvider;
}

function checkText(text: string): string {
  const t = text.trim();
  if (t.length < STORY_MIN_CHARS) throw new StoryError(400, `Write at least ${STORY_MIN_CHARS} characters: a few sentences on the situation, your task, what you did and what changed.`);
  if (t.length > STORY_MAX_CHARS) throw new StoryError(400, `That story is too long: keep it under ${STORY_MAX_CHARS.toLocaleString("en-IN")} characters.`);
  return t;
}

function checkTitle(title: string | null | undefined, required: boolean): string | null {
  const t = (title ?? "").replace(/\s+/g, " ").trim();
  if (!t) {
    if (required) throw new StoryError(400, "Give your story a short title, so you can find it later.");
    return null;
  }
  if (t.length > TITLE_MAX_CHARS) throw new StoryError(400, `Keep the title under ${TITLE_MAX_CHARS} characters.`);
  return t;
}

async function structure({ repo, llm }: Deps, sessionId: string, text: string) {
  const res = await withAiCall(repo, { sessionId, purpose: "story_structure", provider: llm.name }, () => llm.run("story_structure", { text }));
  return structureStar(text, res.data);
}

/** SB1: one story (and its title) → sorted into STAR from the user's own sentences → saved in the bank. */
export async function addStory(
  deps: Deps,
  sessionId: string,
  input: { text: string; title?: string | null },
  source: "pasted" | "discovery" = "pasted",
): Promise<StoryRow> {
  const title = checkTitle(input.title, source === "pasted");
  const rawText = checkText(input.text);
  const { sentences, state, dropped } = await structure(deps, sessionId, rawText);
  const row = await deps.repo.stories.create({
    sessionId,
    source,
    rawText,
    title,
    format: "star",
    state,
    situation: null,
    decision: null,
    result: null,
    sentences,
  });
  await recordEvent(deps.repo, sessionId, "story_added", { count: 1, dropped_spans: dropped, source });
  return row;
}

/** 4.5: rename, mark ready / not ready, or edit the text (which re-sorts it into STAR and clears "ready"). */
export async function updateStory(
  deps: Deps,
  sessionId: string,
  id: string,
  change: { ready?: boolean; rawText?: string; title?: string | null },
): Promise<StoryRow> {
  let story = await deps.repo.stories.findForSession(id, sessionId);
  if (!story) throw new StoryError(404, "That story was not found.");

  if (change.title !== undefined || change.rawText !== undefined) {
    const title = change.title !== undefined ? checkTitle(change.title, story.source === "pasted") : story.title;
    if (change.rawText !== undefined) {
      const rawText = checkText(change.rawText);
      const { sentences, state } = await structure(deps, sessionId, rawText);
      const changed = rawText !== story.rawText;
      story = await deps.repo.stories.update(id, { title, rawText, format: "star", state, situation: null, decision: null, result: null, sentences });
      // The old text was the evidence for any competency mapped to this story: those mappings become gaps
      // until the user runs matching again, so the hub never shows a "why it fits" quote that is gone (review fix).
      if (changed) await deps.repo.competencyMap.invalidateStory(id);
    } else {
      story = await deps.repo.stories.update(id, { title });
    }
    return story;
  }

  if (change.ready !== undefined) {
    if (change.ready && story.state === "draft") {
      const missing = story.format === "star" ? missingParts(story).map((p) => STAR_LABEL[p]) : [];
      throw new StoryError(
        409,
        missing.length
          ? `Add the missing ${joinParts(missing)} first: edit the story, then mark it ready.`
          : "We couldn't find a situation or decision in this story yet. Edit it to say what you decided, then mark it ready.",
      );
    }
    const updated = await deps.repo.stories.update(id, { state: change.ready ? "ready" : "structured" });
    if (change.ready && story.state !== "ready") await recordEvent(deps.repo, sessionId, "story_marked_ready", {});
    return updated;
  }
  return story;
}

/** Delete one story (owner only). Any competency matched to it shows as not matched until matching runs again. */
export async function deleteStory(deps: Deps, sessionId: string, id: string): Promise<void> {
  const story = await deps.repo.stories.findForSession(id, sessionId);
  if (!story) throw new StoryError(404, "That story was not found.");
  await deps.repo.stories.delete(id);
  await recordEvent(deps.repo, sessionId, "story_deleted", { source: story.source });
}

function joinParts(parts: string[]): string {
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export interface MatchScope {
  /** Only these stories (default: every story in the session). */
  storyIds?: string[];
  /** Only these competencies (default: every competency of the interview). */
  competencyIds?: string[];
  /** Also check competencies that already have a story (default: only empty ones). Never replaces a story the user picked unless `replaceChosen`. */
  includeLinked?: boolean;
  replaceChosen?: boolean;
}

export interface MatchResult {
  /** Every mapping row of the interview after the run. */
  rows: CompetencyMapRow[];
  /** Competencies that got a story in this run. */
  linked: string[];
  /** Stories that were checked. */
  checked: number;
}

/**
 * SB4 / G3 (scoped since 2026-11-22, design/01): match stories to the interview's competencies.
 * Only competencies without a story are checked (unless `includeLinked`), so a run never replaces a match,
 * and never one the user picked by hand. The model proposes; code accepts a match only if the story belongs
 * to this user and the reason is a verbatim quote from that story. A checked competency with no fit becomes
 * a gap, so after a full run every competency has a story or a gap.
 */
export async function matchStories(deps: Deps, sessionId: string, interviewId: string, scope: MatchScope = {}): Promise<MatchResult> {
  const interview = await deps.repo.interviews.findForSession(interviewId, sessionId);
  if (!interview) throw new StoryError(404, "That interview was not found.");
  const competencies = await deps.repo.competencies.listByInterview(interviewId);
  const allStories = await deps.repo.stories.listBySession(sessionId);
  const stories = scope.storyIds ? allStories.filter((s) => scope.storyIds!.includes(s.id)) : allStories;
  const byId = new Map(stories.map((s) => [s.id, s]));
  const current = new Map((await deps.repo.competencyMap.listByCompetencies(competencies.map((c) => c.id))).map((m) => [m.competencyId, m]));

  const candidates = competencies.filter((c) => {
    if (scope.competencyIds && !scope.competencyIds.includes(c.id)) return false;
    const m = current.get(c.id);
    if (!m || m.isGap) return true;
    if (m.chosenByUser) return Boolean(scope.replaceChosen);
    return Boolean(scope.includeLinked);
  });

  const linked: string[] = [];
  if (candidates.length && stories.length) {
    const res = await withAiCall(deps.repo, { sessionId, purpose: "story_map", provider: deps.llm.name }, () =>
      deps.llm.run("story_map", {
        competencies: candidates.map((c) => ({ label: c.label, jd_quote: c.jdQuote })),
        stories: stories.map((s) => ({ id: s.id, text: s.rawText })),
      }),
    );
    for (const m of res.data.mappings) {
      const c = candidates.find((x) => x.label.trim().toLowerCase() === m.competency_label.trim().toLowerCase());
      const story = m.story_id ? byId.get(m.story_id) : undefined;
      const loc = story && m.rationale_quote ? locateQuote(story.rawText, m.rationale_quote) : null;
      if (!c || !story || !loc || linked.includes(c.id)) continue;
      await deps.repo.competencyMap.set({ competencyId: c.id, storyId: story.id, isGap: false, rationaleQuote: story.rawText.slice(loc.start, loc.end), chosenByUser: false });
      linked.push(c.id);
    }
  }
  // Checked but nothing fits: a gap (only where there was no story; a kept story is never removed).
  for (const c of candidates) {
    const m = current.get(c.id);
    if (!linked.includes(c.id) && (!m || m.isGap)) await deps.repo.competencyMap.set({ competencyId: c.id, storyId: null, isGap: true, rationaleQuote: null, chosenByUser: false });
  }

  // "Match new story" clears once every story added since the last match has been checked.
  const since = interview.matchedAt?.getTime() ?? -Infinity;
  if (allStories.filter((s) => s.createdAt.getTime() > since).every((s) => byId.has(s.id))) await deps.repo.interviews.setMatchedAt(interviewId, new Date());

  const rows = await deps.repo.competencyMap.listByCompetencies(competencies.map((c) => c.id));
  return { rows, linked, checked: stories.length };
}

/** Kept for callers that want the classic "match everything" run. */
export const mapStories = async (deps: Deps, sessionId: string, interviewId: string) => (await matchStories(deps, sessionId, interviewId)).rows;

/**
 * Change / Unlink on a question card (design/01): the user picks a story for a competency by hand, or removes
 * the link. Picking marks it "chosen by you" so automatic matching never replaces it. Unlinking removes only
 * the link: the story stays in My stories and the card goes back to its CV prompts.
 */
export async function setCompetencyStory(deps: Pick<Deps, "repo">, sessionId: string, competencyId: string, storyId: string | null): Promise<CompetencyMapRow> {
  const competency = await deps.repo.competencies.findById(competencyId);
  const interview = competency ? await deps.repo.interviews.findForSession(competency.interviewId, sessionId) : null;
  if (!competency || !interview) throw new StoryError(404, "That skill was not found.");
  if (storyId === null) {
    const row: CompetencyMapRow = { competencyId, storyId: null, isGap: true, rationaleQuote: null, chosenByUser: false };
    await deps.repo.competencyMap.set(row);
    return row;
  }
  const story = await deps.repo.stories.findForSession(storyId, sessionId);
  if (!story) throw new StoryError(404, "That story was not found.");
  const row: CompetencyMapRow = { competencyId, storyId, isGap: false, rationaleQuote: null, chosenByUser: true };
  await deps.repo.competencyMap.set(row);
  return row;
}

/**
 * "Build story" (design/01): after saving a story written for one question, check it against that question's
 * competency only. It is linked (with a verbatim "why it fits") only if it shows the competency.
 */
/** Throws 404 unless the competency belongs to one of this session's interviews. */
export async function assertOwnedCompetency({ repo }: Pick<Deps, "repo">, sessionId: string, competencyId: string): Promise<void> {
  const competency = await repo.competencies.findById(competencyId);
  if (!competency || !(await repo.interviews.findForSession(competency.interviewId, sessionId))) throw new StoryError(404, "That skill was not found.");
}

export async function linkBuiltStory(
  deps: Deps,
  sessionId: string,
  storyId: string,
  competencyId: string,
): Promise<{ competencyId: string; rationaleQuote: string | null } | null> {
  const competency = await deps.repo.competencies.findById(competencyId);
  const interview = competency ? await deps.repo.interviews.findForSession(competency.interviewId, sessionId) : null;
  if (!competency || !interview) throw new StoryError(404, "That skill was not found.");
  const [before] = await deps.repo.competencyMap.listByCompetencies([competencyId]);
  const { linked, rows } = await matchStories(deps, sessionId, interview.id, {
    storyIds: [storyId],
    competencyIds: [competencyId],
    includeLinked: true,
    replaceChosen: true,
  });
  if (!linked.includes(competencyId)) {
    // Not a fit: leave whatever was there before untouched.
    if (before) await deps.repo.competencyMap.set(before);
    return null;
  }
  if (!before || before.isGap) await recordEvent(deps.repo, sessionId, "gap_story_filled", { source: "build_story" });
  const row = rows.find((r) => r.competencyId === competencyId);
  return { competencyId, rationaleQuote: row?.rationaleQuote ?? null };
}
