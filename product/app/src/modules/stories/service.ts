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

/**
 * SB4 / G3: map each of this interview's competencies to the best story, or mark a gap.
 * The model proposes; code accepts a mapping only if the story belongs to this user and the reason is a
 * verbatim quote from that story. Everything else becomes a gap, so every competency always has one or the other.
 */
export async function mapStories(deps: Deps, sessionId: string, interviewId: string): Promise<CompetencyMapRow[]> {
  const interview = await deps.repo.interviews.findForSession(interviewId, sessionId);
  if (!interview) throw new StoryError(404, "That interview was not found.");
  const competencies = await deps.repo.competencies.listByInterview(interviewId);
  const stories = await deps.repo.stories.listBySession(sessionId);
  const byId = new Map(stories.map((s) => [s.id, s]));

  const rows: CompetencyMapRow[] = competencies.map((c) => ({ competencyId: c.id, storyId: null, isGap: true, rationaleQuote: null }));
  if (stories.length && competencies.length) {
    const res = await withAiCall(deps.repo, { sessionId, purpose: "story_map", provider: deps.llm.name }, () =>
      deps.llm.run("story_map", {
        competencies: competencies.map((c) => ({ label: c.label, jd_quote: c.jdQuote })),
        stories: stories.map((s) => ({ id: s.id, text: s.rawText })),
      }),
    );
    for (const m of res.data.mappings) {
      const i = competencies.findIndex((c) => c.label.trim().toLowerCase() === m.competency_label.trim().toLowerCase());
      const story = m.story_id ? byId.get(m.story_id) : undefined;
      const loc = story && m.rationale_quote ? locateQuote(story.rawText, m.rationale_quote) : null;
      if (i < 0 || !story || !loc) continue;
      rows[i] = { competencyId: competencies[i].id, storyId: story.id, isGap: false, rationaleQuote: story.rawText.slice(loc.start, loc.end) };
    }
  }
  await deps.repo.competencyMap.replace(competencies.map((c) => c.id), rows);
  return rows;
}
