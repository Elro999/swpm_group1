# STATUS: live state of the product build

> **Update this file at the end of every task, in the same commit as the work.** It is the first thing the next agent reads. History belongs in `log.md`; this file only says where things stand *now*.

**Last updated:** 2026-11-13 · **By:** Suraj via Claude
**Branch:** `dev/suraj-working` (local; not pushed; **Phases 0–7 work is not committed yet**)
**In progress (2026-11-14): live demo.** Team chose **OpenAI only** (LLM `gpt-6.1-sol` judge / `gpt-6-luna` fast, STT `whisper-1` word timestamps, supported until 26 Feb 2027) and **Vercel CLI** deploy. Done: OpenAI adapters `src/modules/ai/live/{openai,prompts}.ts` with fake-fetch tests; env `LLM_PROVIDER`; factory live wiring. **Supabase ready (2026-11-14):** new project **`interview-prep-companion`**, id **`mljqvqavyizuciyknieu`**, region ap-south-1, in Suraj's Supabase org ($0/month), created via the Supabase connector; migrations 0001–0003 applied and verified (13 tables, RLS on all, 0 policies, private `audio` bucket). The org's other project `isb-campus-iq` was not touched. `app/.env.local` (mode 600, git-ignored) holds all live values. **Live smoke test passed (2026-11-14)** against real OpenAI + Supabase via the production build: JD → 5 competencies + 5 questions (all JD quotes verbatim) in ~7 s; synthesised-speech answer → whisper-1 → follow-up (~9 s) → follow-up answer → feedback (~11 s) with 4 points, every quote found in the transcript; story bank split 2 pasted stories into verbatim spans and mapped 3/5 competencies (2 gaps). Bug found and fixed: `audio/mp4` (Safari/iOS) uploads were rejected by OpenAI when named `.mp4`; now sent as `.m4a` (test added). `npm run verify` green: 142 unit, 23 E2E. The project database holds a few synthetic smoke-test sessions. **Deployed (2026-11-14): https://interview-prep-companion.vercel.app** — Vercel project `interview-prep-companion` on Suraj's Hobby account, deployed with the Vercel CLI from `product/app` (not Git-connected: the repo belongs to another GitHub account, so redeploy with `npx vercel deploy --prod` from `product/app`). Functions pinned to Mumbai (`app/vercel.json` → `bom1`) next to the Supabase database. The 8 env vars are set as sensitive production variables. The same live smoke test passed against the public URL (`/api/health` reports live + supabase). **Review fixes deployed (2026-11-14):** two Codex adversarial reviews (one against the actual deck) raised 10 findings; all fixed, tested and verified live — request-wide AI deadline; no invented numbers/names/roles in feedback or follow-ups; silent recordings deleted, "delete my data" sweeps the session's storage folder; atomic per-session + deployment-wide AI quota (`AI_GLOBAL_DAILY_LIMIT`, default 1500/day) and per-IP session throttle (`SESSION_STARTS_PER_HOUR`, default 60); 30-day audio retention via daily Vercel Cron (`/api/cron/retention`, `CRON_SECRET`); exclusive attempt processing + transactional feedback save; lossless story pasting; story edits invalidate stale competency evidence. Migration `0004_review_fixes.sql` applied. `npm run verify` green: 161 unit, 23 E2E. Live probe (local and production): concurrent requests → one 200 + one 409 with a single AI call; cron 401 without secret, 200 with it; delete-my-data removed an orphan recording. Still open: real-microphone checks on Safari/iPhone and Chrome; set a monthly spend limit in the OpenAI dashboard.
**Current phase:** **Phase 7 hardening done (7.1–7.3, 7.6 demo script)**. **Blocked on you:** 2.9 live AI (provider + keys), 7.4 deploy (Supabase + Vercel), 7.5 first-5-user test (recruits + reviewers). 6.5 fake door waits on team decision Q7.
**Overall:** with no keys or accounts, a visitor can paste a JD and get JD-grounded questions; practise out loud with one follow-up and feedback pinned to their own words and times; retry and compare; and build a story bank (decision first, team vs own, nothing invented) matched to the role's skills with gaps flagged. The AI is mocked, so feedback and structuring are demos until 2.9.

## Decisions made (do not re-litigate without a log entry)
| Date | Decision | By |
|---|---|---|
| 2026-11-13 | Host on **Vercel + Supabase** (Postgres + private audio bucket) | Suraj |
| 2026-11-13 | Build the **full MVP1** per the deck, sequenced core loop first | Suraj |
| 2026-11-13 | AI providers **undecided**: build behind `LlmProvider` / `SttProvider` with a mock mode; recommended default Claude + OpenAI Whisper | Suraj (deferred) |
| 2026-11-13 | Stack: **Next.js 16.4** App Router + TypeScript + Tailwind 4; Vitest 4 + Playwright; Zod 4 contracts | Claude (no objection) |
| 2026-11-13 | No accounts in MVP1: anonymous session + resume link | Deck |
| 2026-11-13 | Added **`DATA_MODE=memory`** (in-process store behind the same `Repo` interface) so the app and all tests run before Supabase exists; refused on Vercel | Claude (logged; doc 02 A6) |
| 2026-11-13 | Audio uploads go **through our API** (not signed direct upload); attempt steps run **synchronously** per request (no polling); delivery checks are **code-owned** | Claude (logged; doc 02 "Deviations") |
| 2026-11-13 | E2E runs on a **production build** with a **microphone test double** | Claude (logged) |

## Progress
| Phase | State |
|---|---|
| 0 Foundation | **done** (0.1–0.7). Supabase path written but untested (see Known issues) |
| 1 Interview setup | **done** (1.1–1.5) |
| 2 Core loop (mock + pinned feedback) | **done in mock mode** (2.1–2.8). **2.9 live adapters + 3 real recordings: pending keys (Q1, Q4)** |
| 3 Retry and compare | **done** (3.1–3.3) |
| 4 Story builder | **done** (4.1–4.5) |
| 5 Gap discovery + prep list | **done** (5.1–5.4; discovery answers are typed, voice not built) |
| 6 Review, metrics, deletion | **done** (6.1–6.4; 6.5 body-language fake door not built, PRD Q7 open) |
| 7 Hardening, deploy, user testing | **7.1–7.3 done, 7.6 demo script done**; **7.4 deploy and 7.5 user test blocked** on accounts and recruits |

## What works right now
- `npm run dev` in `product/app` with no `.env.local` → mock AI + in-memory data.
- **Phase 0:** health route, anonymous sessions + resume links, events with no-user-text guard, `ai_calls` metadata log, security headers.
- **Phase 1:** landing, add interview (JD + optional date/CV), hub with 3–5 questions each quoting the JD, competencies, consent gate, resume link, draft privacy page.
- **Phase 2:**
  - Hub shows **Practise** per question after consent → `/i/[id]/mock/[qid]`.
  - **Recorder**: MediaRecorder (WebM/Opus or MP4/AAC), 3:00 cap with timer, listen back, record again, clear messages for blocked or missing microphones.
  - **Pipeline** (`modules/attempt`): answer upload → transcribe → one verified follow-up → record or skip → analyse → ready. Failures keep the audio; "Try again" resumes without re-recording. Silence asks to re-record.
  - **Feedback** (`modules/feedback`): time to decision, I vs we, length computed **in code** from word timings; fit judgements from the model accepted only with verbatim quotes and no rewrite. Each point shows the quote, the time, and ▶ plays the user's recording from that moment; transcript highlights.
  - **Not useful?** with optional reason, persisted; events `feedback_viewed`, `first_feedback_viewed` (with time since start, for goal G1), `retry_started`, `retry_feedback_viewed`, `point_marked_not_useful` recorded server-side.
  - Consent and ownership enforced on every attempt API (403 without consent, 404 for anyone else's data).
- **Phase 3:** `/i/[id]/mock/[qid]/compare` shows the same five checks for two attempts with Better / Worse / Same, plus **Fixed**, **Still there** (before and now quotes), **New to look at** and **Working well**. Defaults to the last two finished attempts; pair picker for 3+; linked from the feedback screen ("Compare with attempt N−1"); `compare_viewed` event.
- **Phase 4:** `/stories` (header link "My stories"): paste one or many stories → cards with **Your decision / Situation / Result as verbatim spans** of the user's text (missing pieces become questions), "Who did what" sentence list with You / Team / Unclear labels and flags ("Says “we”", "A result without evidence"), Mark ready, Edit (re-structures, back to Structured). Hub "What this role tests": Add / Open my stories, **Match my stories to this role** → each competency shows the matched story with a verbatim "Why it fits" quote, or **Gap**. `modules/stories/guard.ts` (G-NO-INVENT) ready for Phase 5 drafts. Migration `0003` fixes the competency_map delete conflict.
- **Phase 5:** hub button "Find stories for this role" (shown even with no stories) marks every competency a gap; each **Gap** has "Find a story for this": paste CV (once) → 3–5 prompts that quote real CV lines → pick one → type an answer → **draft story from the user's own words** fills the gap ("Draft, from your answer"). **Prep list** on the hub: 3–5 × 20-minute blocks (rehearse matched stories until ready, practise questions until they have feedback, retries to top up), spread over the days to the interview (Today / Tomorrow / dates), "N of M done"; updates live as stories become ready (derived, not stored).
- **Phase 6:** `/admin` (team key → HMAC cookie): the six metrics (five MVP hypotheses + "not useful" counter-metric) with count, target and pass / below target / no data, and a review queue of sessions; `/admin/s/[id]` shows each attempt's transcript, every point's quote, time and "not useful" reason, and the session's stories. **Delete my data** (two-step) on `/privacy` and each hub removes recordings and every row and kills the private link. `session_returned` recorded after a 12 h+ gap. Consent notice and privacy page now say a team member may read transcripts to check feedback.
- **Phase 7:** daily cap of 80 AI calls per session (friendly 429, work kept; enforced in `withAiCall`); friendly 404 and error pages; admin login rate limit (10 failed tries per IP per 15 min); automated accessibility scan (axe-core, WCAG 2.1 A/AA) of all main screens with **no serious or critical violations**; `npm audit`: **0 vulnerabilities in production dependencies** (7 moderate are dev-only, in `minimatch` via the lint toolchain); demo script `04_demo-script.md`.
- **Verification:** `npm run verify` green on 2026-11-14: lint ✓, typecheck ✓, **134 unit tests ✓**, **23 E2E tests ✓** (production build, incl. accessibility scan), `npm run build` ✓.
- **Not verified:** a **real microphone** (E2E uses a test double; Chromium's fake audio device hung in this machine's sandbox), Safari/Android recording, real speech-to-text accuracy, phones and screen readers.

## Start here (for the next agent)
1. Read root `instructions.md`, `product/instructions.md`, this file, then `app/README.md` and the module READMEs you will touch.
2. `cd product/app && npm install && npx playwright install chromium && npm run verify` should be green before you change anything.
3. If keys exist: task **2.9** (see `src/modules/ai/README.md` "Not yet done": Claude via the `claude-api` skill; STT with word timestamps and punctuation aligned onto words). What is left needs the user: **2.9** live adapters once keys exist; **7.4** deploy (S1 Supabase: run migrations 0001–0003, smoke-test `DATA_MODE=supabase`; S2 Vercel root `product/app`, env vars, phone check); **7.5** first-5-user test with a teammate reviewer each (use `/admin`). Smaller follow-ups: audio retention job (30 days), manual keyboard / screen-reader pass, story delete, keyboard-focusable transcript seeking.

## Blockers and waiting-on
| Item | Needed from | Needed by |
|---|---|---|
| AI provider choice and keys (S3, Q1) | Suraj | Task 2.9 live mode (the product's real value) |
| Supabase project, migrations 0001 + 0002 + 0003 applied, keys in `app/.env.local` (S1) | Suraj | Before any real-user deploy; feature work proceeds in memory mode |
| Manual mic check on Chrome, Safari, Android (task 2.1) | Anyone with a device | Before user testing |
| Consent wording and retention (Q2) | Team | Phase 7 public release |
| Who owns the Vercel project / repo access (S2) | Team | Phase 7 |
| Submission / demo date (blank in the deck) | Team | Planning |
| First-5-user recruiting and reviewers (Q3) | Team | Phase 7.5 |

## Known issues
- Supabase migrations (`0001`–`0003`), `src/lib/db/supabase.ts` and the Supabase audio store in `src/lib/audio.ts` are **written but never executed** (no project yet; no local Postgres or Docker here).
- Single stories cannot be deleted (only everything, via "Delete my data").
- The review page is fine for a 5-person team but loads every session in one pass (max 500).
- Retention is not enforced yet: audio is not auto-deleted after 30 days as the privacy draft says (needs a scheduled job; task 7.x, decide with Q2).
- Story matching runs only when the user presses "Match"; it does not re-run automatically after stories change (the hub shows "Match again").
- `npm audit`: 7 moderate advisories, all dev-only (`minimatch` in the lint toolchain); production dependencies have none (reviewed 7.3; not force-upgraded).
- The AI-call cap and admin rate limit count in memory per server instance (the cap reads `ai_calls`, so it is shared once on Supabase; the admin limiter is not).
- Live AI mode intentionally throws until task 2.9.
- **Not-found pages return HTTP 200** (hub and practice pages): the ownership check runs inside a streamed Suspense boundary. The page shows "could not be found", sets `noindex`, and renders no data. Low severity.
- Transcript words in `FeedbackView` are clickable to seek but are not keyboard-focusable; the per-point ▶ buttons are the keyboard path (a11y pass in task 7.2).
- WebM recordings from MediaRecorder lack duration metadata; seeking via ▶ works in Chrome in principle but was **not tested with real audio**.
- Privacy page and consent text are **drafts** (PRD Q2); provider names are not filled in yet (Q1).

## How to run
See `app/README.md`. Short version: `cd product/app && npm install && npm run dev` → http://localhost:3000. Tests: `npm run verify` (first time: `npx playwright install chromium`).

## Environment notes (this machine, 2026-11-13)
Node v25.8.0, npm 11.11.0, git 2.50.1. **Not installed:** pnpm, Vercel CLI, Supabase CLI, GitHub CLI (`gh`), Postgres, Docker. Playwright Chromium headless shell is installed in the user cache. In this machine's sandbox, Chromium's fake media device (`--use-fake-device-for-media-stream`) **hangs** in `getUserMedia`/`enumerateDevices`, which is why E2E uses `e2e/fixtures/fake-mic.ts`. `engines.node` is `>=20.9.0`.
