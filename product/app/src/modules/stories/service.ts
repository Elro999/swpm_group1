import type { CompetencyMapRow, Repo, StoryRow } from "@/lib/db/types";
import { locateQuote } from "@/lib/text";
import { withAiCall } from "@/modules/ai/log";
import type { LlmProvider } from "@/modules/ai/types";
import { recordEvent } from "@/modules/events/events";
import { structureFromModel, type StructuredStory } from "./structure";

/**
 * Story bank (SB1–SB5) and competency mapping (SB4, G3).
 * Stories are session-wide (not per interview), so one bank serves every role the user prepares for.
 */
export const STORY_MIN_CHARS = 40;
export const STORY_MAX_CHARS = 20_000;

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
  if (t.length < STORY_MIN_CHARS) throw new StoryError(400, `Paste at least ${STORY_MIN_CHARS} characters: a few sentences about what happened, what you decided and what changed.`);
  if (t.length > STORY_MAX_CHARS) throw new StoryError(400, `That is too much text at once: keep it under ${STORY_MAX_CHARS.toLocaleString("en-IN")} characters.`);
  return t;
}

async function structure({ repo, llm }: Deps, sessionId: string, text: string) {
  const res = await withAiCall(repo, { sessionId, purpose: "story_structure", provider: llm.name }, () => llm.run("story_structure", { text }));
  return structureFromModel(text, res.data);
}

/** SB1: paste one or many stories → verified, decision-first stories in the bank. */
export async function addStories(deps: Deps, sessionId: string, text: string, source: "pasted" | "discovery" = "pasted"): Promise<StoryRow[]> {
  const clean = checkText(text);
  const { stories, dropped } = await structure(deps, sessionId, clean);
  const rows: StoryRow[] = [];
  for (const s of stories) rows.push(await deps.repo.stories.create({ sessionId, source, ...s }));
  await recordEvent(deps.repo, sessionId, "story_added", { count: rows.length, dropped_spans: dropped, source });
  return rows;
}

/** 4.5: mark ready / not ready, or edit the text (which re-structures and clears "ready"). */
export async function updateStory(deps: Deps, sessionId: string, id: string, change: { ready?: boolean; rawText?: string }): Promise<StoryRow> {
  const story = await deps.repo.stories.findForSession(id, sessionId);
  if (!story) throw new StoryError(404, "That story was not found.");

  if (change.rawText !== undefined) {
    const clean = checkText(change.rawText);
    const { stories } = await structure(deps, sessionId, clean);
    // An edit is one story: keep the structured piece that covers the most of the text, but the raw text is all of it.
    const best = stories.filter((s) => s.state === "structured").sort((a, b) => b.rawText.length - a.rawText.length)[0];
    const next: StructuredStory = best
      ? { ...best, rawText: clean, ...rebaseInto(clean, best) }
      : structureFromModel(clean, { stories: [] }).stories[0];
    return deps.repo.stories.update(id, { ...next, state: next.state === "draft" ? "draft" : "structured" });
  }

  if (change.ready !== undefined) {
    if (change.ready && story.state === "draft") {
      throw new StoryError(409, "We couldn't find a situation or decision in this story yet. Edit it to say what you decided, then mark it ready.");
    }
    const updated = await deps.repo.stories.update(id, { state: change.ready ? "ready" : "structured" });
    if (change.ready && story.state !== "ready") await recordEvent(deps.repo, sessionId, "story_marked_ready", {});
    return updated;
  }
  return story;
}

/** Re-find a structured story's spans inside the full edited text (offsets change when the text is wider). */
function rebaseInto(fullText: string, s: StructuredStory): Pick<StructuredStory, "situation" | "decision" | "result" | "sentences"> {
  const move = (f: StructuredStory["situation"]) => {
    if (!f) return null;
    const loc = locateQuote(fullText, f.text);
    return loc ? { text: fullText.slice(loc.start, loc.end), start: loc.start, end: loc.end } : null;
  };
  return { situation: move(s.situation), decision: move(s.decision), result: move(s.result), sentences: structureFromModel(fullText, { stories: [] }).stories[0]?.sentences ?? [] };
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
