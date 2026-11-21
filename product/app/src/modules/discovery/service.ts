import type { LlmTaskMap } from "@/lib/contracts";
import type { CompetencyMapRow, CompetencyRow, InterviewRow, Repo, StoryRow } from "@/lib/db/types";
import { firstWords, locateQuote, splitSentences } from "@/lib/text";
import { withAiCall } from "@/modules/ai/log";
import type { LlmProvider } from "@/modules/ai/types";
import { recordEvent } from "@/modules/events/events";
import { findInventions } from "@/modules/stories/guard";
import { addStories } from "@/modules/stories/service";

/**
 * Gap discovery (PRD SD1, SD2): when a JD competency has no story, prompt the user with questions that
 * point at THEIR OWN CV, then turn their answer into a draft story (verbatim spans only) and fill the gap.
 */
export const CV_MIN_CHARS = 20;
export const CV_MAX_CHARS = 20_000;
export const MIN_PROMPTS = 3;
export const MAX_PROMPTS = 5;

export class DiscoveryError extends Error {
  constructor(public readonly status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = "DiscoveryError";
  }
}

interface Deps {
  repo: Repo;
  llm: LlmProvider;
}

export interface GapPrompt {
  text: string;
  /** Verbatim lines from the user's CV that the prompt points at. */
  references: string[];
}

async function loadOwnedCompetency(repo: Repo, competencyId: string, sessionId: string): Promise<{ competency: CompetencyRow; interview: InterviewRow }> {
  const competency = await repo.competencies.findById(competencyId);
  const interview = competency ? await repo.interviews.findForSession(competency.interviewId, sessionId) : null;
  if (!competency || !interview) throw new DiscoveryError(404, "That skill was not found.");
  return { competency, interview };
}

/** Add or replace the CV / list of past roles for an interview (needed for SD1 prompts). */
export async function saveCv({ repo }: Pick<Deps, "repo">, sessionId: string, interviewId: string, cv: string): Promise<InterviewRow> {
  const interview = await repo.interviews.findForSession(interviewId, sessionId);
  if (!interview) throw new DiscoveryError(404, "That interview was not found.");
  const clean = cv.trim();
  if (clean.length < CV_MIN_CHARS) throw new DiscoveryError(400, "Paste your CV or a few lines about your past roles and projects (at least 20 characters).");
  if (clean.length > CV_MAX_CHARS) throw new DiscoveryError(400, `That CV text is too long: keep it under ${CV_MAX_CHARS.toLocaleString("en-IN")} characters.`);
  return repo.interviews.setCv(interviewId, clean);
}

/**
 * Keep only prompts that are questions, whose references are real CV lines, and whose wording introduces
 * no number or name the user did not give us (CV, JD, competency). Ownership words are allowed here
 * because prompts ask ("did you lead…?"), they never claim.
 */
export function verifyPrompts(cv: string, context: string, proposed: LlmTaskMap["gap_prompts"]["output"]["prompts"]): GapPrompt[] {
  const kept: GapPrompt[] = [];
  for (const p of proposed) {
    const text = p.text.trim();
    if (!text.includes("?")) continue;
    const refs = p.references.map((r) => locateQuote(cv, r)).filter((l): l is { start: number; end: number } => Boolean(l));
    if (refs.length !== p.references.length || !refs.length) continue;
    if (findInventions(text, `${cv}\n${context}`).some((i) => i.kind !== "ownership")) continue;
    if (kept.some((k) => k.text.toLowerCase() === text.toLowerCase())) continue;
    kept.push({ text, references: refs.map((l) => cv.slice(l.start, l.end)) });
    if (kept.length >= MAX_PROMPTS) break;
  }
  return kept;
}

/** Deterministic prompts built straight from CV lines, used when the model's prompts fail verification. */
export function fallbackPrompts(cv: string, competencyLabel: string): GapPrompt[] {
  const lines = cv.split("\n").map((l) => l.trim()).filter((l) => l.length >= 8);
  const pieces = lines.length ? lines : splitSentences(cv).map((s) => s.text);
  const skill = competencyLabel.toLowerCase();
  const templates = [
    (r: string) => `Think about “${r}”. When did that work need you to show ${skill}? What did you decide?`,
    (r: string) => `In “${r}”, what was the hardest call you made yourself, and what happened next?`,
    (r: string) => `During “${r}”, when did a plan change? What did you do differently?`,
  ];
  const out: GapPrompt[] = [];
  for (let i = 0; out.length < MIN_PROMPTS && pieces.length; i++) {
    const ref = firstWords(pieces[i % pieces.length], 8);
    out.push({ text: templates[i % templates.length](ref), references: [ref] });
    if (i > 10) break;
  }
  return out;
}

/** SD1: 3–5 prompts for one gap, each pointing at a real line of the user's CV. */
export async function gapPrompts(deps: Deps, sessionId: string, competencyId: string): Promise<GapPrompt[]> {
  const { competency, interview } = await loadOwnedCompetency(deps.repo, competencyId, sessionId);
  const cv = interview.cvText;
  if (!cv) throw new DiscoveryError(409, "Paste your CV or a list of past roles first, so the prompts can point at your own experience.");

  const context = `${competency.label}\n${competency.jdQuote}\n${interview.jdText}`;
  let kept: GapPrompt[] = [];
  for (let attempt = 0; attempt < 2 && kept.length < MIN_PROMPTS; attempt++) {
    const res = await withAiCall(deps.repo, { sessionId, purpose: "gap_prompts", provider: deps.llm.name }, () =>
      deps.llm.run("gap_prompts", { competency: competency.label, cv }),
    );
    const v = verifyPrompts(cv, context, res.data.prompts);
    if (v.length > kept.length) kept = v;
  }
  if (kept.length < MIN_PROMPTS) {
    for (const p of fallbackPrompts(cv, competency.label)) {
      if (kept.length >= MIN_PROMPTS) break;
      if (!kept.some((k) => k.text === p.text)) kept.push(p);
    }
  }
  return kept.slice(0, MAX_PROMPTS);
}

/**
 * SD2: the user's answer becomes a draft story ("from your answer"), built only from their words
 * (verbatim spans via addStories), and fills this competency's gap with a verbatim reason.
 */
export async function draftStoryFromAnswer(
  deps: Deps,
  sessionId: string,
  competencyId: string,
  answer: string,
): Promise<{ story: StoryRow; mapping: CompetencyMapRow }> {
  const { competency } = await loadOwnedCompetency(deps.repo, competencyId, sessionId);
  const [story] = await addStories(deps, sessionId, answer, "discovery");
  const reason =
    story.decision?.text ?? story.situation?.text ?? splitSentences(story.rawText)[0]?.text ?? firstWords(story.rawText, 12);
  // The reason must be the user's own words; this always holds for spans, and is re-checked here.
  const loc = locateQuote(story.rawText, reason);
  const mapping: CompetencyMapRow = {
    competencyId: competency.id,
    storyId: story.id,
    isGap: false,
    rationaleQuote: loc ? story.rawText.slice(loc.start, loc.end) : null,
  };
  await deps.repo.competencyMap.replace([competency.id], [mapping]);
  await recordEvent(deps.repo, sessionId, "gap_story_filled", { draft_state: story.state });
  return { story, mapping };
}
