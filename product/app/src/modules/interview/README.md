# modules/interview

**Purpose:** turn a pasted job description into an interview the user can practise for: 4–6 competencies quoted from the JD and 3–5 fit/behavioural questions (PRD US-0.2, MF1; feeds SB4 in Phase 4).

## Intended behaviour
1. `validateInterviewInput` checks the form: JD 150–10,000 chars and ≥ 25 words; CV ≤ 20,000 chars (optional); date `YYYY-MM-DD` and real (optional). Each error message says exactly what to fix.
2. `createInterview` asks the LLM for competencies, then questions. Each step is **verified before anything is stored**:
   - `verifyCompetencies`: every `jd_quote` must be found in the JD (whitespace/case tolerant via `locateQuote`). The stored quote is the **JD's own text at those offsets**, not the model's copy. Duplicates are dropped; max 6.
   - `verifyQuestions`: the question's JD quote must be real, its competency must be one of the verified ones, and it must not be a case, guesstimate, technical, coding or puzzle question (C3). Max 5.
3. Each step gets **one retry** if verification leaves too few (fewer than 4 competencies or 3 questions). If it is still short, `InterviewGenerationError` → HTTP 422 with a plain message, and **nothing is stored**. We never pad with invented items.
4. On success it records `interview_added` with counts only (`competencies`, `questions`, `dropped_quotes`, `has_cv`, `has_date`). Every model call is logged via `withAiCall`.
5. If storing fails half-way, the interview is deleted (compensation), so there is never a partial interview.

## Files
| File | Role |
|---|---|
| `validation.ts` | Form rules and messages |
| `verify.ts` | Deterministic checks on model output |
| `service.ts` | `createInterview`: generate → verify → retry → store → event |
| `format.ts` | `roleTitle` (first JD line) and `describeInterviewDate` ("in 18 days") |

## Where it is used
`POST /api/interviews` (`src/app/api/interviews/route.ts`) · `/interviews/new` form · hub `/i/[id]` (`src/app/i/[id]/InterviewHub.tsx`) · landing `ContinueList`.

**Tests:** `interview.test.ts` (validation, verifiers with fabricated quotes, retry, clean failure), `format.test.ts`, `e2e/phase1-interview-setup.spec.ts`.
