import type { LlmTaskMap } from "@/lib/contracts";
import type { NewCompetency } from "@/lib/db/types";
import { locateQuote } from "@/lib/text";

/**
 * Deterministic checks on model output before anything is stored or shown (constraint C2, C3).
 * The model proposes; these functions decide. Nothing here calls a model.
 */

export const MAX_COMPETENCIES = 6;
export const MAX_QUESTIONS = 5;

/** Fit and behavioural only (C3): no case, guesstimate, technical or puzzle questions. */
const OUT_OF_SCOPE_QUESTION = /\b(case|guesstimate|estimate|market size|puzzle|coding|code|algorithm|technical|calculate|brain ?teaser)\b/i;

type ModelCompetency = LlmTaskMap["competencies"]["output"]["competencies"][number];
type ModelQuestion = LlmTaskMap["questions"]["output"]["questions"][number];

export function verifyCompetencies(jd: string, proposed: ModelCompetency[]): { kept: NewCompetency[]; dropped: number } {
  const kept: NewCompetency[] = [];
  let dropped = 0;
  for (const c of proposed) {
    const loc = locateQuote(jd, c.jd_quote);
    const duplicate = loc && kept.some((k) => k.jdQuoteStart === loc.start && k.jdQuoteEnd === loc.end);
    if (!loc || duplicate || kept.length >= MAX_COMPETENCIES) {
      dropped += loc && !duplicate ? 0 : 1;
      continue;
    }
    // Store the JD's own text at those offsets, not the model's copy of it.
    kept.push({ label: c.label.trim(), jdQuote: jd.slice(loc.start, loc.end), jdQuoteStart: loc.start, jdQuoteEnd: loc.end, ord: kept.length });
  }
  return { kept, dropped };
}

export interface VerifiedQuestion {
  /** Index into the verified competency list (resolved to an id when stored). */
  competencyOrd: number;
  text: string;
  jdQuote: string;
}

export function verifyQuestions(
  jd: string,
  competencies: Pick<NewCompetency, "label" | "jdQuote" | "ord">[],
  proposed: ModelQuestion[],
): { kept: VerifiedQuestion[]; dropped: number } {
  const kept: VerifiedQuestion[] = [];
  let dropped = 0;
  const norm = (s: string) => s.trim().toLowerCase();
  for (const q of proposed) {
    const loc = locateQuote(jd, q.jd_quote);
    const competency = competencies.find((c) => norm(c.label) === norm(q.competency_label));
    const text = q.text.trim();
    const ok = loc && competency && !OUT_OF_SCOPE_QUESTION.test(text) && !kept.some((k) => norm(k.text) === norm(text));
    if (!ok || kept.length >= MAX_QUESTIONS) {
      if (!ok) dropped++;
      continue;
    }
    kept.push({ competencyOrd: competency.ord, text, jdQuote: jd.slice(loc.start, loc.end) });
  }
  return { kept, dropped };
}
