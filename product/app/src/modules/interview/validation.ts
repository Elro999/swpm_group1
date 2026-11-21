import { z } from "zod";

/**
 * Input rules for adding an interview (US-0.2, MF1). Messages say exactly what is missing, so the
 * user can fix it; nothing is invented to fill a gap.
 */
export const JD_MIN_CHARS = 150;
export const JD_MIN_WORDS = 25;
export const JD_MAX_CHARS = 10_000;
export const CV_MAX_CHARS = 20_000;

export interface InterviewInput {
  jd: string;
  cv: string | null;
  interviewDate: string | null; // YYYY-MM-DD
}

export type InterviewField = "jd" | "cv" | "interviewDate";
export type ValidationResult = { ok: true; data: InterviewInput } | { ok: false; errors: Partial<Record<InterviewField | "form", string>> };

const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const schema = z.object({
  jd: z
    .string({ error: "Paste the job description." })
    .trim()
    .min(JD_MIN_CHARS, `The job description is too short: paste at least ${JD_MIN_CHARS} characters, including the responsibilities and requirements.`)
    .max(JD_MAX_CHARS, `The job description is too long: keep it under ${JD_MAX_CHARS.toLocaleString("en-IN")} characters.`)
    .refine((s) => s.split(/\s+/).filter(Boolean).length >= JD_MIN_WORDS, {
      message: "This doesn't look like a job description yet: paste the responsibilities and requirements, not just a title.",
    }),
  cv: z
    .string()
    .trim()
    .max(CV_MAX_CHARS, `The CV text is too long: keep it under ${CV_MAX_CHARS.toLocaleString("en-IN")} characters.`)
    .optional()
    .nullable(),
  interviewDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((s) => !s || isRealDate(s), { message: "Use a real date (YYYY-MM-DD), or leave it empty." }),
});

export function validateInterviewInput(raw: unknown): ValidationResult {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    const errors: Partial<Record<InterviewField | "form", string>> = {};
    for (const issue of parsed.error.issues) {
      const field = (issue.path[0] as InterviewField | undefined) ?? "form";
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const { jd, cv, interviewDate } = parsed.data;
  return { ok: true, data: { jd, cv: cv ? cv : null, interviewDate: interviewDate ? interviewDate : null } };
}
