import type { LlmTaskMap } from "@/lib/contracts";
import type { CompetencyRow, InterviewRow, Repo } from "@/lib/db/types";
import { firstWords, locateQuote, splitSentences } from "@/lib/text";
import { withAiCall } from "@/modules/ai/log";
import type { LlmProvider } from "@/modules/ai/types";
import { findInventions } from "@/modules/stories/guard";

/**
 * Gap discovery (PRD SD1, SD2; role page cards since 2026-11-22): each question card shows prompts that point
 * at THEIR OWN CV; "Build story" takes the user to My stories with the card's question and CV line as a guide.
 */
export const CV_MIN_CHARS = 20;
export const CV_MAX_CHARS = 20_000;
/** Per card (design/01): 0–4 prompts, best first; at least 2 when there is a CV. */
export const MIN_PROMPTS = 2;
export const MAX_PROMPTS = 4;

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

/** Add or replace the CV / list of past roles for an interview (needed for SD1 prompts). */
export async function saveCv({ repo }: Pick<Deps, "repo">, sessionId: string, interviewId: string, cv: string): Promise<InterviewRow> {
  const interview = await repo.interviews.findForSession(interviewId, sessionId);
  if (!interview) throw new DiscoveryError(404, "That interview was not found.");
  const clean = cv.trim();
  if (clean.length < CV_MIN_CHARS) throw new DiscoveryError(400, "Paste your CV or a few lines about your past roles and projects (at least 20 characters).");
  if (clean.length > CV_MAX_CHARS) throw new DiscoveryError(400, `That CV text is too long: keep it under ${CV_MAX_CHARS.toLocaleString("en-IN")} characters.`);
  const saved = await repo.interviews.setCv(interviewId, clean);
  // A new CV means new prompts: clear the saved ones so the role page makes them again.
  for (const c of await repo.competencies.listByInterview(interviewId)) await repo.competencyPrompts.replace(c.id, []);
  return saved;
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

/** Prompts for one competency: one model call, verified; topped up from CV lines when too few survive. */
async function promptsFor(deps: Deps, sessionId: string, competency: CompetencyRow, interview: InterviewRow, cv: string): Promise<GapPrompt[]> {
  const context = `${competency.label}\n${competency.jdQuote}\n${interview.jdText}`;
  const res = await withAiCall(deps.repo, { sessionId, purpose: "gap_prompts", provider: deps.llm.name }, () =>
    deps.llm.run("gap_prompts", { competency: competency.label, cv }),
  );
  const kept = verifyPrompts(cv, context, res.data.prompts);
  for (const p of fallbackPrompts(cv, competency.label)) {
    if (kept.length >= MIN_PROMPTS) break;
    if (!kept.some((k) => k.text === p.text)) kept.push(p);
  }
  return kept.slice(0, MAX_PROMPTS);
}

/**
 * SD1 on the role page (design/01): every question's competency gets up to 4 CV prompts, made once and saved,
 * so the cards show them without a click and "Build story" links can carry IDs only. No CV → no prompts.
 * Returns how many competencies got new prompts.
 */
export async function ensureCardPrompts(deps: Deps, sessionId: string, interviewId: string): Promise<number> {
  const interview = await deps.repo.interviews.findForSession(interviewId, sessionId);
  if (!interview) throw new DiscoveryError(404, "That interview was not found.");
  if (!interview.cvText) return 0;
  const [competencies, questions] = await Promise.all([deps.repo.competencies.listByInterview(interviewId), deps.repo.questions.listByInterview(interviewId)]);
  const asked = new Set(questions.map((q) => q.competencyId));
  const have = new Set((await deps.repo.competencyPrompts.listByCompetencies(competencies.map((c) => c.id))).map((p) => p.competencyId));
  let made = 0;
  for (const c of competencies) {
    if (!asked.has(c.id) || have.has(c.id)) continue;
    const prompts = await promptsFor(deps, sessionId, c, interview, interview.cvText);
    await deps.repo.competencyPrompts.replace(c.id, prompts.map((p) => ({ text: p.text, refs: p.references })));
    made++;
  }
  return made;
}

/** What "Build story" needs on My stories, looked up from IDs only (never text in the URL), owner only. */
export interface BuildContext {
  interviewId: string;
  questionId: string;
  questionNo: number;
  questionText: string;
  competencyId: string;
  competencyLabel: string;
  prompt: { id: string; text: string; cvLine: string | null } | null;
}

export async function loadBuildContext(
  { repo }: Pick<Deps, "repo">,
  sessionId: string,
  ids: { interviewId: string; questionId: string; promptId: string | null },
): Promise<BuildContext | null> {
  const interview = await repo.interviews.findForSession(ids.interviewId, sessionId);
  if (!interview) return null;
  const questions = await repo.questions.listByInterview(interview.id);
  const index = questions.findIndex((q) => q.id === ids.questionId);
  const question = questions[index];
  if (!question?.competencyId) return null;
  const competency = await repo.competencies.findById(question.competencyId);
  if (!competency || competency.interviewId !== interview.id) return null;
  const prompt = ids.promptId ? await repo.competencyPrompts.findById(ids.promptId) : null;
  return {
    interviewId: interview.id,
    questionId: question.id,
    questionNo: index + 1,
    questionText: question.text,
    competencyId: competency.id,
    competencyLabel: competency.label,
    prompt: prompt && prompt.competencyId === competency.id ? { id: prompt.id, text: prompt.text, cvLine: prompt.refs[0] ?? null } : null,
  };
}
