import type { CompetencyRow, InterviewRow, NewCompetency, QuestionRow, Repo } from "@/lib/db/types";
import { withAiCall } from "@/modules/ai/log";
import type { LlmProvider } from "@/modules/ai/types";
import { recordEvent } from "@/modules/events/events";
import type { InterviewInput } from "./validation";
import { verifyCompetencies, verifyQuestions, type VerifiedQuestion } from "./verify";

/**
 * Adding an interview (US-0.2, MF1, SB4): JD → 4–6 verified competencies → 3–5 verified questions.
 * Each model step gets ONE retry when verification leaves too few items. If it still fails, nothing is
 * stored and the caller shows a plain error. We never pad with invented items.
 */
export const MIN_COMPETENCIES = 4;
export const MIN_QUESTIONS = 3;

export class InterviewGenerationError extends Error {
  constructor(public readonly stage: "competencies" | "questions") {
    super(
      stage === "competencies"
        ? "We couldn't pick out enough skills from this job description. Try pasting the full responsibilities and requirements."
        : "We couldn't write enough questions for this job description. Please try again in a moment.",
    );
    this.name = "InterviewGenerationError";
  }
}

export interface CreatedInterview {
  interview: InterviewRow;
  competencies: CompetencyRow[];
  questions: QuestionRow[];
  /** How many model-proposed items failed verification (tracked, never shown). */
  droppedQuotes: number;
}

interface Deps {
  repo: Repo;
  llm: LlmProvider;
}

async function generateCompetencies({ repo, llm }: Deps, sessionId: string, jd: string) {
  let dropped = 0;
  let best: NewCompetency[] = [];
  for (let attempt = 0; attempt < 2 && best.length < MIN_COMPETENCIES; attempt++) {
    const res = await withAiCall(repo, { sessionId, purpose: "competencies", provider: llm.name }, () => llm.run("competencies", { jd }));
    const v = verifyCompetencies(jd, res.data.competencies);
    dropped += v.dropped;
    if (v.kept.length > best.length) best = v.kept;
  }
  if (best.length < MIN_COMPETENCIES) throw new InterviewGenerationError("competencies");
  return { competencies: best, dropped };
}

async function generateQuestions({ repo, llm }: Deps, sessionId: string, jd: string, competencies: NewCompetency[]) {
  let dropped = 0;
  let best: VerifiedQuestion[] = [];
  const input = { jd, competencies: competencies.map((c) => ({ label: c.label, jd_quote: c.jdQuote })) };
  for (let attempt = 0; attempt < 2 && best.length < MIN_QUESTIONS; attempt++) {
    const res = await withAiCall(repo, { sessionId, purpose: "questions", provider: llm.name }, () => llm.run("questions", input));
    const v = verifyQuestions(jd, competencies, res.data.questions);
    dropped += v.dropped;
    if (v.kept.length > best.length) best = v.kept;
  }
  if (best.length < MIN_QUESTIONS) throw new InterviewGenerationError("questions");
  return { questions: best, dropped };
}

export async function createInterview(deps: Deps, sessionId: string, input: InterviewInput): Promise<CreatedInterview> {
  const { repo } = deps;
  // Generate and verify everything BEFORE writing, so a failure leaves no half-made interview.
  const c = await generateCompetencies(deps, sessionId, input.jd);
  const q = await generateQuestions(deps, sessionId, input.jd, c.competencies);

  const interview = await repo.interviews.create({ sessionId, jdText: input.jd, cvText: input.cv, interviewDate: input.interviewDate });
  try {
    const competencies = await repo.competencies.insertMany(interview.id, c.competencies);
    const byOrd = new Map(competencies.map((row) => [row.ord, row.id]));
    const questions = await repo.questions.insertMany(
      interview.id,
      q.questions.map((vq, i) => ({ competencyId: byOrd.get(vq.competencyOrd) ?? null, text: vq.text, jdQuote: vq.jdQuote, ord: i })),
    );
    const droppedQuotes = c.dropped + q.dropped;
    await recordEvent(repo, sessionId, "interview_added", {
      competencies: competencies.length,
      questions: questions.length,
      dropped_quotes: droppedQuotes,
      has_cv: input.cv !== null,
      has_date: input.interviewDate !== null,
    });
    return { interview, competencies, questions, droppedQuotes };
  } catch (err) {
    await repo.interviews.delete(interview.id).catch(() => undefined); // compensate; never leave a partial interview
    throw err;
  }
}
