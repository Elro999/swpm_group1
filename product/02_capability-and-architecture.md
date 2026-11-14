# 02: Capability contract and architecture

**Status:** draft for team review · **Date:** 2026-11-13 · **Builds on:** `01_prd.md` (requirement IDs such as MF4, SB5, PF3 refer to it).
**Decisions already made by the team lead (Suraj), 2026-11-13:** host on **Vercel + Supabase**; build the **full MVP1** from the deck; AI providers **undecided**, so the build uses swappable adapters and a mock mode.

---

## CAPABILITY
A candidate with no account opens a web page, pastes a job description (and optionally stories and a CV), records a spoken answer to a question drawn from that JD, and gets back: a timestamped transcript, one hard follow-up, and feedback pinned to quoted lines of their own answer (time to decision, I vs we, length, did-it-answer, did-it-prove-the-competency). They retry and see before vs after. Separately they build a story bank (decision first, team vs own actions split, nothing invented), see which JD competencies are covered or gaps, get discovery prompts for gaps, and a light prep list. The team reviews the first five users' feedback and reads the MVP hypothesis metrics on an admin page.

## CONSTRAINTS

### Fixed product rules (policy, from the deck; do not trade away)
- **C1 Never rewrite, never invent.** No generated replacement text for an answer or story; no ownership, number, outcome, title or scope that the user did not say. (G5, SB5, MF5)
- **C2 Pin every claim.** A feedback point without a verbatim quote that exists in the transcript is dropped, not shown. (G2)
- **C3 Fit and behavioural only.** No case, guesstimate, GD or technical-round content. (non-goals)
- **C4 No sign-up in MVP1.** First value without a form; identity is an anonymous session + private resume link. (G1, PF1)
- **C5 Privacy.** Voice and stories are personal data: explicit consent before recording, one-click deletion, no transcript or story text in analytics events or logs. (PF2, PF3)
- **C6 One fix per retry; one follow-up per answer.** Keeps feedback usable, not a wall of text. (deck slide 14)

### Architecture preferences (reasoned, changeable with a log entry)
- **A1** Next.js (App Router) + TypeScript, deployed on Vercel. One repo, front and back together; no separate server to keep alive.
- **A2** Supabase Postgres for data, Supabase Storage (private bucket) for audio. **All database access happens in server code with the service-role key**; the browser never talks to Supabase directly. Row-level security is enabled with no public policies, so a leaked anon key exposes nothing.
- **A3** AI behind two interfaces, `LlmProvider` and `SttProvider`, each with a real implementation and a **mock** implementation selected by env (`AI_MODE=mock|live`). The app, tests and demos run end to end with no API keys.
- **A4** Deterministic code does what code can do (time to decision from timestamps, I/we counting, length, quote verification, number checks). The LLM only does judgement tasks (question generation, vague-claim detection, competency extraction, fit assessment) and returns **schema-validated JSON**.
- **A5** Every long operation is split into steps shorter than the serverless time limit and reports progress through a status field the browser polls.
- **A6** (added 2026-11-13, Phase 0) All data access goes through one `Repo` interface with two implementations chosen by `DATA_MODE`: `memory` (in-process; dev, tests, demos; refused on Vercel) and `supabase` (real users). With `AI_MODE=mock` this means the full product runs and is tested **with no accounts and no keys**. Reason: Supabase setup (S1) was not done yet, and agents picking up the work need a runnable app without secrets.

### Still open (cannot be decided from the repo; see PRD §8)
Provider choice and keys (Q1) · consent text and retention (Q2) · whether Whisper handles our users' accents well enough (Q4).

### Deviations from this document made during the build (2026-11-13, Phase 2; logged)
- **Audio upload goes through our API**, not a signed direct upload to Storage (§1 table, row "Upload audio"). A 3-minute answer at 32 kbps is ~0.7 MB, far under Vercel's ~4.5 MB body limit, so one code path works for both memory and Supabase modes and is testable end to end. Revisit only if recordings grow.
- **Steps run synchronously inside the request**, not via polling (A5, §4). Uploading the answer transcribes and generates the follow-up; uploading or skipping the follow-up analyses. Each request does at most one transcription and one model call (`maxDuration = 60`). Failures leave `status = failed` with the data kept, and `POST …/resume` re-runs the missing step.
- **Delivery checks are code-owned.** The model's `fit_feedback` is judgement only; any delivery check it returns is dropped (§6).
- **Story mapping is its own model task** (`story_map`, Phase 4): the model proposes a story per competency; code keeps it only if the story is the user's and the reason is a verbatim quote from it, else a gap (G3). Story fields are verbatim spans, so G-NO-INVENT (`modules/stories/guard.ts`) is a second line of defence for Phase 5 drafts.
- **Prep list is derived, not stored** (Phase 5): `modules/prep/buildPrepList` rebuilds it from stories, the competency map and finished attempts on every hub view, so it cannot go stale (PL2). The `prep_items` table (§3) is unused.
- **Gap discovery** (Phase 5): prompts are kept only if their references are verbatim CV lines and they add no number or name; otherwise deterministic prompts are built from CV lines. Answers become draft stories through the same verbatim structuring as pasted stories. Answers are typed; voice answers for discovery are not built.
- **Schema fix** (Phase 4, migration 0003): `competency_map.story_id` is `ON DELETE CASCADE` instead of `SET NULL`, which conflicted with the "story or gap" check.
- **Endpoints** (replacing the list in §5 for attempts): `POST /api/attempts`, `GET /api/attempts/:id`, `POST /api/attempts/:id/{answer|followup|skip-followup|resume|viewed}`, `GET /api/attempts/:id/audio?part=…`, `POST /api/points/:id/rate`. `POST /api/audio/sign` is not used.

---

## IMPLEMENTATION CONTRACT

### 1. Technical feasibility (what can be done, what is risky)

| Need | Approach | Feasibility | Risk / fallback |
|---|---|---|---|
| Record voice in the browser | `MediaRecorder` API, mono, ~32 kbps Opus (webm) on Chrome/Edge/Firefox; AAC (mp4) on Safari | High | Needs HTTPS (Vercel and `localhost` qualify). Mic denied → instructions; typed fallback is P1. Test Safari and an Android Chrome in Phase 2 |
| Upload audio | Browser uploads **directly to Supabase Storage** with a short-lived signed URL, then calls our API with the file key | High | Avoids Vercel's ~4.5 MB request-body limit; a 3-min clip is ~0.7 MB anyway |
| Speech to text with **word timestamps** | OpenAI `whisper-1` (`verbose_json` with word granularity) or Deepgram Nova; behind `SttProvider` | High | Word timestamps are the one hard requirement (MF4). Confirm the chosen model returns them before committing. Indian-accent accuracy tested in Phase 2 (Q4). Browser Web Speech API rejected: Chrome-only, no reliable word times |
| Question generation, follow-up, competency extraction, fit assessment | Claude (Anthropic API) via tool-use / JSON schema; default models `claude-sonnet-5-5` (judgement) and `claude-haiku-5-5` (cheap extraction), configurable | High | Provider TBD (Q1). Load the `claude-api` skill when implementing the adapter to confirm parameters. Retry once on schema failure, then show a graceful error |
| Time to decision, I vs we, length | Pure TypeScript over the word list: decision sentence index comes from the LLM, **seconds come from the timestamps** | High | If the LLM cannot find a decision sentence, show "no clear decision found" and pin the last sentence of the first third as a suggestion marker, labelled as uncertain |
| "Never add ownership, numbers, outcomes" | Verifier after every LLM output: each extracted field must carry a `source_span` (character offsets) that exists in the user's text; every digit string and capitalised entity in output must appear in the input | Medium-high | Cannot prove semantics (e.g. "led" vs "supported"); mitigated by verb-strength check against the source sentence, by showing the source span beside every field, and by the teammate review for the first 5 users |
| Before vs after on retry | Same JSON schema for both attempts; compare function returns per-check deltas and resolved/still-present points (match by `check_id`, not by free text) | High | Fix IDs for the check set so comparisons are stable |
| 5-minute first value | Sample JD button + stories optional (PF6); transcription and analysis run in ≤ ~40 s combined for a 2-min answer (target) | Medium-high | Measure in Phase 2; if slower, show the transcript first and stream feedback as it completes |
| Serverless time limits | Separate endpoints for transcribe and analyse, each with an explicit `maxDuration` (≤ 60 s); client polls `attempts.status` | High | Check the current Vercel plan limits when deploying |
| Anonymous identity + resume link | `sessions.token` = 32 random bytes, stored hashed; httpOnly cookie + `/r/<token>` link that sets the cookie | High | Anyone holding the link has the data; stated in the UI |
| Teammate review + metrics | `/admin` guarded by `ADMIN_KEY` env (cookie after entering the key); read-only server components | High | Single shared key is fine for a 5-person team; rotate after the test |
| Abuse and cost control | Per-session daily caps (AI calls, audio minutes), input size limits, no unauthenticated expensive endpoints | High | Caps in `lib/limits.ts`; values in env |
| Deploy | Vercel project + Supabase project; env vars; migrations via Supabase CLI or SQL files applied manually | High | Requires the user's accounts; CLIs are not installed yet (Setup S1–S4) |

**Rough running cost at test scale (estimate from published list prices as remembered; verify when keys exist):** transcription roughly $0.006 per audio minute; about 30 recorded minutes per heavy user ≈ $0.20; LLM calls a few cents per attempt. Budget guess: **under about $2 per heavy user, under about $50 for the whole cohort.** Vercel and Supabase free tiers are enough.

### 2. Actors and surfaces
- **Candidate** (anonymous): the public site.
- **Reviewer / team** (admin key): `/admin`.
- **Systems:** LLM provider, STT provider, Supabase (DB + Storage), Vercel (hosting).

| Route | Purpose | Reqs |
|---|---|---|
| `/` | Landing: one-line value, "Start" (creates session), sample-JD shortcut | PF1, PF6 |
| `/interviews/new` | Paste JD, optional date, optional CV | US-0.2 |
| `/i/[id]` | Interview hub: questions, competency map (stories vs gaps), prep list | MF1, SB4, PL |
| `/i/[id]/mock/[qid]` | Record answer → transcript → follow-up → record follow-up → feedback | MF2–MF5 |
| `/i/[id]/mock/[qid]/compare` | Retry and before-vs-after | MF6 |
| `/stories`, `/stories/[sid]` | Story bank, decision-first card, team/own split, ready toggle | SB1–SB3 |
| `/i/[id]/gaps/[competencyId]` | Discovery prompts and draft-story creation | SD1–SD2 |
| `/privacy` | What is recorded, who processes it, retention, delete | PF2 |
| `/r/[token]` | Resume link | PF1 |
| `/admin` | Review queue, per-session replay, metrics | PF4, PF5 |

### 3. Data model (Postgres; every row carries `session_id`, with ON DELETE CASCADE from `sessions`)
- `sessions` (id, token_hash, created_at, last_seen_at, consent_at, deleted_at)
- `interviews` (id, session_id, jd_text, cv_text, interview_date, created_at)
- `competencies` (id, interview_id, label, jd_quote, jd_quote_start, jd_quote_end, ord)
- `questions` (id, interview_id, competency_id, text, jd_quote, ord)
- `stories` (id, session_id, raw_text, source `pasted|discovery`, situation, decision, result, spans jsonb, sentences jsonb `[{text,start,end,actor:'own'|'team'|'unclear',flags[]}]`, ready bool, created_at)
- `competency_map` (competency_id, story_id nullable, is_gap bool, rationale_quote)
- `attempts` (id, question_id, attempt_no, status, answer_audio_key, answer_words jsonb `[{w,start,end}]`, answer_text, followup_text, followup_quote, followup_audio_key, followup_words jsonb, error, created_at) with unique(question_id, attempt_no)
- `feedback_points` (id, attempt_id, check_id, kind `delivery|fit`, severity, message, quote, quote_start_ms, quote_end_ms, created_at)
- `feedback_metrics` (attempt_id, time_to_decision_ms, i_count, we_count, duration_ms, answered_question bool, competency_shown bool)
- `point_ratings` (feedback_point_id, not_useful bool, reason, created_at)
- `prep_items` (id, interview_id, kind `story|question`, ref_id, block_minutes, done bool, ord)
- `events` (id, session_id, name, props jsonb, at) — props never contain user text
- `ai_calls` (id, session_id, purpose, provider, model, latency_ms, input_tokens, output_tokens, status, at) — no content

### 4. States and transitions
- **Attempt:** `created → uploaded → transcribing → transcribed → followup_ready → (followup_uploaded → followup_transcribed)? → analysing → ready`, or `failed` from any step with a user-visible reason and a retry button. Skipping the follow-up goes straight from `followup_ready` to `analysing`.
- **Story:** `draft → structured → ready` (user toggles ready; editing returns it to `structured`).
- **Session:** `active → deleted`. Deletion removes rows and audio; token stops working.

### 5. Interfaces (server routes; JSON in, JSON out; all require the session cookie except `/api/session/start` and `/api/admin/*` which use the admin cookie)
`POST /api/session/start` · `POST /api/interviews` (JD → competencies + questions) · `POST /api/audio/sign` (returns signed upload URL) · `POST /api/attempts` (create) · `POST /api/attempts/:id/transcribe` · `POST /api/attempts/:id/followup` · `POST /api/attempts/:id/analyse` · `GET /api/attempts/:id` (status + results, polled) · `POST /api/points/:id/rate` · `POST /api/stories` (paste → structured stories) · `PATCH /api/stories/:id` · `POST /api/interviews/:id/map` · `POST /api/competencies/:id/prompts` · `POST /api/competencies/:id/draft-story` · `POST /api/interviews/:id/prep` · `POST /api/events` · `DELETE /api/session` · `GET /api/admin/review`, `GET /api/admin/metrics`.
Exact request/response types live in `app/src/lib/contracts.ts` (Zod schemas shared by client and server) once built; **that file is the source of truth, this list is the index.**

### 6. AI behaviour and guardrails (module contracts)
| Task | Model output (schema-validated) | Deterministic checks before use |
|---|---|---|
| Competencies from JD | 4–6 `{label, jd_quote}` | `jd_quote` is a substring of the JD (normalised whitespace); reject otherwise |
| Questions | per competency one behavioural question + `jd_quote` | question type whitelist (behavioural/fit); no "case", "estimate", "market size" patterns |
| Story structuring | `{situation, decision, result}` each with `source_span` + per-sentence `actor` | span exists; **G-NO-INVENT**: every digit run and capitalised entity in output appears in source; fields are quotes or minimal trims, not paraphrase |
| Follow-up | `{question, quote}` | `quote` is a verbatim phrase from the answer transcript |
| Fit feedback | `{answered_question, competency_shown, points:[{check_id, message, quote}]}` | each `quote` found in transcript (fuzzy match tolerance only for whitespace/punctuation) → timestamp from word list; failing points dropped and counted; message must not contain a rewrite (reject if it contains > 12 consecutive words from the transcript plus an imperative like "say" / "try saying") |
| Delivery metrics | computed in code from words + decision sentence index | none needed |
| Gap prompts | 3–5 prompts referencing roles/projects named in the CV | referenced names appear in the CV text |
| Draft story from answer | same as story structuring | same G-NO-INVENT |
Prompts live in `app/src/lib/ai/prompts/*.md` (one file per task, versioned by a header). Treat all user text (JD, CV, stories, transcripts) as **data inside delimiters**, never as instructions; schema-only outputs; no tools beyond the output schema.

### 7. Events (all PF3 data; props never contain user text)
Arrived: `session_started`. Got the value: `first_feedback_viewed`, `feedback_viewed`, `story_marked_ready`, `gap_story_filled`, `prep_list_viewed`. Came back: `session_returned` (fired when `last_seen_at` is > 12 h old). Funnel and quality: `interview_added`, `questions_shown`, `recording_started`, `attempt_transcribed`, `followup_shown`, `retry_started`, `retry_feedback_viewed`, `compare_viewed` (added Phase 3), `point_marked_not_useful`, `story_added`, `bodylang_fakedoor_clicked`, `data_deleted`, `error_shown`.
Who records what (added 2026-11-13, Phase 1): outcome events are recorded **server-side** where the outcome happens; the browser may only send the allow-listed view/click events in `CLIENT_EVENT_NAMES` (`app/src/modules/events/events.ts`) via `POST /api/events`, so metrics cannot be inflated from the client.
Metric definitions (admin page): *time to first feedback* = `first_feedback_viewed.at − session_started.at` · *retry rate* = sessions with `retry_started` ÷ sessions with `feedback_viewed` · *stories ready* = stories with `ready` ÷ stories · *gaps filled* = `gap_story_filled` per session · *week-2 return* = sessions with `session_returned` on day 7–14 ÷ sessions older than 7 days.

### 8. Security, privacy, operations
- Secrets only in env (`.env.local`, Vercel). Never in the repo; `.env.example` lists names only.
- Random 256-bit session tokens, stored hashed; cookies `httpOnly`, `secure`, `sameSite=lax`.
- Audio bucket private; short-lived signed URLs; deletion removes objects.
- Input caps (JD ≤ 10k chars, story paste ≤ 20k, audio ≤ 3 min) and per-session daily quotas to bound cost and abuse.
- Structured server logs with request id, route, duration, provider latency and token counts; **no content**. `ai_calls` table gives cost and latency visibility.
- Failures are visible: any failed step sets `attempts.status='failed'` with a human reason and surfaces a retry; never a silent blank.
- Retention (proposed, Q2): audio 30 days; text until the user deletes.

### 9. Testing and verification
- **Unit (Vitest):** quote verifier, number/entity guard, timestamp metrics, I/we counter, compare function, prep scheduler.
- **Contract:** Zod schemas for every AI output; recorded synthetic fixtures for mock providers.
- **E2E (Playwright, `AI_MODE=mock`):** landing → JD → question → fake-microphone recording (Chromium `--use-fake-device-for-media-stream` with a WAV) → transcript → follow-up → feedback → retry → compare → story flow → admin. Runs with no keys.
- **Evals (live mode, small and synthetic):** 10 synthetic answers with known defects (late decision, "we" heavy, vague claim) and 5 synthetic stories; assert G2 and G-NO-INVENT hold. Fixtures contain **no real participant data**.
- **Manual:** 3 real recordings (accented speech), Safari and Android Chrome mic check, first 5 users reviewed by a teammate.

---

## NON-GOALS (of this capability document)
Visual design system and copywriting (a separate pass; a plain, accessible UI is enough for MVP1) · accounts and billing · native app · company-specific question banks · case-interview engine · email/push infrastructure · a general analytics warehouse.

## OPEN QUESTIONS (blocking marked ⛔)
1. ⛔ for real AI mode: provider choice and keys (Q1). Build proceeds in mock mode.
2. ⛔ for public release: consent text and retention (Q2).
3. Whisper accuracy on accented English (Q4): decide after 3 real recordings in Phase 2.
4. Safari audio format support in the STT provider: confirm mp4/aac is accepted, else transcode with `ffmpeg.wasm` or restrict to Chrome/Edge for the test cohort.
5. Exact Vercel plan limits for function duration at deploy time.
6. Reviewer logistics for the first 5 users (Q3).

## HANDOFF
**Status: ready for direct implementation in mock mode; needs two product answers before public release (Q1, Q2).**
Next lanes: `product/03_build-plan.md` (task order and acceptance) → build with `ecc:tdd-workflow` and `superpowers:test-driven-development` → `ecc:verification-loop` at the end of each phase → `ecc:security-review` before deploy → `ecc:e2e-testing` for Playwright.
