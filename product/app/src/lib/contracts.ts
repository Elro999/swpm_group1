import { z } from "zod";

/**
 * Shared contracts (Zod). Source of truth for every AI output shape and for API payloads as they
 * are added. product/02_capability-and-architecture.md §5–6 is the index; this file wins if they differ.
 *
 * Conventions: times are integer milliseconds from the start of the recording; quotes are VERBATIM
 * substrings of the user's text (JD, transcript, story, CV). Verifiers (Phase 1+) enforce that.
 */

// ---------- Speech to text ----------
export const WordSchema = z.object({
  w: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type Word = z.infer<typeof WordSchema>;

export const TranscriptSchema = z.object({
  words: z.array(WordSchema),
  text: z.string(),
  durationMs: z.number().int().nonnegative(),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

// ---------- LLM tasks ----------
const quote = z.string().min(1).max(400);

export const CompetenciesOutput = z.object({
  competencies: z.array(z.object({ label: z.string().min(2).max(80), jd_quote: quote })).min(4).max(6),
});

export const QuestionsOutput = z.object({
  questions: z
    .array(z.object({ competency_label: z.string().min(2).max(80), text: z.string().min(10).max(300), jd_quote: quote }))
    .min(3)
    .max(5),
});

export const FollowupOutput = z.object({
  question: z.string().min(10).max(300),
  /** The vague phrase from the answer that the follow-up probes (verbatim). */
  quote,
});

/** Stable check ids so a retry can be compared point by point (MF6). */
export const CHECK_IDS = [
  "late_decision",
  "no_decision",
  "we_not_i",
  "too_long",
  "did_not_answer",
  "competency_not_shown",
  "vague_claim",
  "strong_moment",
] as const;
export const CheckId = z.enum(CHECK_IDS);

export const FitFeedbackOutput = z.object({
  answered_question: z.boolean(),
  competency_shown: z.boolean(),
  /** Index into the transcript's sentences where the user states their own decision; null if none. */
  decision_sentence_index: z.number().int().nonnegative().nullable(),
  points: z
    .array(
      z.object({
        check_id: CheckId,
        severity: z.enum(["info", "warn", "fix"]),
        /** A pointer or a question, never replacement text for the user to say (C1). */
        message: z.string().min(5).max(300),
        quote,
      }),
    )
    .max(6),
});

const span = z.object({ text: z.string().min(1), start: z.number().int().nonnegative(), end: z.number().int().nonnegative() });

export const StoryStructureOutput = z.object({
  stories: z
    .array(
      z.object({
        situation: span,
        decision: span.nullable(),
        result: span.nullable(),
        sentences: z.array(
          z.object({
            start: z.number().int().nonnegative(),
            end: z.number().int().nonnegative(),
            actor: z.enum(["own", "team", "unclear"]),
            flags: z.array(z.enum(["we", "no_evidence"])),
          }),
        ),
      }),
    )
    .min(1)
    .max(10),
});

export const GapPromptsOutput = z.object({
  prompts: z
    .array(z.object({ text: z.string().min(10).max(300), references: z.array(z.string().min(1).max(120)).max(3) }))
    .min(3)
    .max(5),
});

/** SB4: for each JD competency, the best story (by id) or null for a gap, with a verbatim reason from the story. */
export const StoryMapOutput = z.object({
  mappings: z
    .array(
      z.object({
        competency_label: z.string().min(1).max(80),
        story_id: z.string().nullable(),
        /** Verbatim words from the chosen story that show the competency; required when story_id is set. */
        rationale_quote: z.string().max(400).nullable(),
      }),
    )
    .max(6),
});

/** Every LLM task: its input shape, output schema and model tier. */
export interface LlmTaskMap {
  competencies: { input: { jd: string }; output: z.infer<typeof CompetenciesOutput> };
  questions: { input: { jd: string; competencies: { label: string; jd_quote: string }[] }; output: z.infer<typeof QuestionsOutput> };
  followup: { input: { question: string; transcript: string }; output: z.infer<typeof FollowupOutput> };
  fit_feedback: { input: { question: string; competency: string; transcript: string; sentences: string[] }; output: z.infer<typeof FitFeedbackOutput> };
  story_structure: { input: { text: string }; output: z.infer<typeof StoryStructureOutput> };
  gap_prompts: { input: { competency: string; cv: string }; output: z.infer<typeof GapPromptsOutput> };
  story_map: {
    input: { competencies: { label: string; jd_quote: string }[]; stories: { id: string; text: string }[] };
    output: z.infer<typeof StoryMapOutput>;
  };
}
export type LlmTask = keyof LlmTaskMap;

export const LLM_TASKS: { [K in LlmTask]: { schema: z.ZodType<LlmTaskMap[K]["output"]>; tier: "judge" | "fast" } } = {
  competencies: { schema: CompetenciesOutput, tier: "fast" },
  questions: { schema: QuestionsOutput, tier: "fast" },
  followup: { schema: FollowupOutput, tier: "judge" },
  fit_feedback: { schema: FitFeedbackOutput, tier: "judge" },
  story_structure: { schema: StoryStructureOutput, tier: "judge" },
  gap_prompts: { schema: GapPromptsOutput, tier: "fast" },
  story_map: { schema: StoryMapOutput, tier: "judge" },
};
