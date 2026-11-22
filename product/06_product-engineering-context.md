# Interview Prep Companion: product + engineering context

*Upload this file with any coding or design prompt (Claude, ChatGPT, Cursor, Codex…) so the AI builds in the same direction as the existing product. It is a summary of the current state; the detailed sources are linked at the end. Last updated: 19 Nov 2026.*

**Live:** https://interview-prep-companion.vercel.app · **Code:** `product/app/` · **Status:** `product/STATUS.md`

---

## 1. Product in one minute

**What it is:** a web app where MBA candidates practise **fit and behavioural interview answers out loud** and get feedback pinned to the exact words they said.

**Who it's for:** MBA students preparing for placement interviews who have the stories but tell them badly: the decision comes late, they say "we" instead of "I", claims are vague, and they're unsure which story fits which competency.

**The promise:** "Practise for *this* job, hear exactly where your answer slips, fix it, and see the difference."

**Product principles (non-negotiable; every change must keep them):**
1. **No quote, no claim.** Every piece of feedback, every mapping reason and every question's source is tied to an exact quote (from the answer, story, CV or job description). Code verifies the quote before showing it.
2. **Point and ask, never rewrite.** The app never gives users replacement wording or scripts answers. Feedback describes what happened and asks a question.
3. **Never invent.** No number, name, employer or bigger role that the user didn't state. Stories are stored as verbatim spans of the user's text.
4. **Measure in code, judge with AI.** Timing, "I vs we" and length are computed from word timestamps; the AI only judges fit (answered the question? showed the competency?).
5. **Private by default.** No account, no name, no email. Anonymous session via cookie only (no cross-device link in v1). Recordings are deleted after 30 days, and "delete my data" works at any time.
6. **Recoverable.** A failed step never makes the user record again; stored data lets them retry the step.

**Goals (PRD, all P0):** G1 first pinned feedback within 5 minutes of landing, no sign-up · G2 every feedback point cites a timestamped line from the user's answer · G3 every JD competency shows a mapped story or a flagged gap · G4 stories sorted into STAR (Situation, Task, Action, Result) from the user's own sentences, own vs team actions split · G5 the AI never adds ownership, numbers or outcomes · G6 every retry shows before vs after on the same checks.
**Success metrics (MVP hypothesis):** ≥ 60% retry after feedback · ≥ 60% of stories marked ready · ≥ 1 gap filled per user · ≥ 40% return in week 2 unprompted.
**Out of scope:** case interviews, guesstimates and group discussions; company-specific question banks; calendar sync or a full task manager; peer or alumni matching.

## 2. Current state of features

| Area | Feature | Status |
|---|---|---|
| Start | Anonymous start, no form (same-browser cookie; no "continue on another device" in v1); "Try with a sample JD" | **Live** |
| Job set-up | Paste a JD (plus optional CV and interview date) → 4–6 competencies, each with a JD quote → 3–5 behavioural questions, each with a JD quote | **Live** |
| Practice | Consent notice → record an answer (max ~3 min) → transcript with word timings | **Live** |
| Practice | One follow-up question quoting the vaguest phrase; answer it by voice or skip | **Live** |
| Feedback | Pinned feedback: late decision / no decision, "we" vs "I", too long (code); did not answer, competency not shown, vague claim, strong moment (AI, max 4); each with a quote and a time range | **Live** |
| Feedback | "Not useful" rating per point (feeds the review queue) | **Live** |
| Retry | Retry a question; side-by-side compare of the same checks: fixed / still present / new / better or worse | **Live** |
| Stories | One story per save, with a title → every sentence sorted into Situation / Task / Action / Result (verbatim; missing parts shown as questions); Action sentences tagged You / Team / Unclear, flags ("Says 'we'", "Result without evidence"); collapsed cards with S·T·A·R progress; mark ready (needs all four parts); edit title and text; delete with a confirmation dialog | **Built 2026-11-22, not deployed** (needs migration 0005) |
| Stories | Nothing written is lost: every sentence lands in one STAR part | **Built 2026-11-22** |
| Role page | One card per question (design/01): competency, status chip, matched story (Open, Change, Unlink, "Chosen by you") or CV prompts, Practise bottom right; consent asked when Practise is pressed, then back to that card | **Built 2026-11-22** (needs migration 0006) |
| Matching | Runs once on the first visit with stories; then "Match new story" / "Match again" check only those stories and only cards without one; never replaces a match or a user's pick. Verbatim "why it fits". Editing a story resets its matches | **Built 2026-11-22** |
| CV prompts | Up to 4 per card, quoting real CV lines, made once and saved; "Build story →" opens My stories with a STAR guide and links the story back if it fits | **Built 2026-11-22** |
| Prep | Prep list: 3–5 blocks of 20 minutes, spread over the days until the interview date; rebuilt from current state | **Live** |
| Streak | Prep streak (branch `feature/streaks`, 2026-11-21): any prep action counts for the day (user's timezone); one rest day per Mon–Sun week; a break of up to 3 days can be revived with one practice rep per lost day by the end of the next day; each interview date is a milestone (road of prepped days, interview day never breaks the streak, result after the date). Header chip, hub card (week strip, interview countdown, revive offer, today's rep), confirmation on the feedback screen. Derived from events, no table, no notifications | **Built** (not yet merged or deployed) |
| Privacy | `/privacy` page, "delete my data" (removes rows and recordings), 30-day audio retention job (daily, 03:00 UTC) | **Live** |
| Team | `/admin` (needs `ADMIN_KEY`): review queue of transcripts and feedback, North Star metrics (first feedback within 5 minutes, retry after feedback, stories marked ready, gaps filled) | **Live** |
| Limits | 80 AI calls per session per 24 h; 1,500 AI calls per day site-wide; 60 new sessions per network per hour | **Live** |
| Not built | Body-language "fake door" (PRD Q7 open); voice answers for gap prompts; user accounts; mobile app | — |
| Not verified | Real-microphone recordings on Safari/iPhone and Chrome (only synthesised speech tested) | Open |

## 3. Design language

**Voice and copy**
- Plain, direct and calm, written in the second person ("Your own decision first appears here, 0:13 in.").
- Feedback **points and asks**: it states what happened, quotes the user, and ends with a question. Never "try saying…", never praise inflation, never jargon.
- Errors say what happened and what to do, and reassure the user nothing is lost ("Your audio is saved, so you can try again without recording."). Never show technical details.
- Indian English spelling in prose (practise, organise); numbers in numerals.

**Visual system** (Tailwind 4 utility classes, shared in `app/src/components/ui.ts`; no component library)
- **Layout:** a single centred column, `max-w-3xl`, generous vertical spacing; header with the product name and "My stories".
- **Colour:** neutral zinc greys for text, borders and surfaces. **Indigo-600** is the one accent (primary buttons, links, focus rings, chips). Amber for gaps and warnings, red only for errors.
- **Type:** Geist Sans (Geist Mono for code); h1 `text-3xl/4xl semibold tracking-tight`, h2 `text-lg semibold`, muted copy `text-sm zinc-500`.
- **Components:** `card` (rounded-xl, 1px border, white or zinc-950), `btnPrimary` (indigo, rounded-lg) / `btnSecondary` (outlined), `chip` (small indigo pill for states like "Ready"), `quote` (left border, italic, muted) for every quoted user or JD text.
- **Dark mode:** every token has a `dark:` variant; follows the system setting.
- **Accessibility:** visible focus rings, touch targets ≥ 44px (`min-h-11`), sufficient contrast in both themes; axe checks run in E2E tests. Buttons are disabled until the page has hydrated so clicks are never lost.

**Rule for new UI:** reuse `ui.*` tokens, show user or JD words with the `quote` style, keep one primary action per screen, and add no new colours or libraries without a reason recorded in `product/log.md`.

## 4. Architecture

**Stack:** Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript, Tailwind 4, Zod 4. Supabase (Postgres + private Storage bucket `audio`). OpenAI: `gpt-6.1-sol` (judging), `gpt-6-luna` (quick extraction), `whisper-1` (speech-to-text with word timestamps). Hosted on Vercel, region `bom1` (Mumbai), next to the Supabase database (ap-south-1). Tests: Vitest (unit), Playwright + axe (E2E).

**Folder map** (`product/app/src/`)
- `app/`: pages (`/`, `/interviews/new`, `/i/[id]` hub, `/i/[id]/mock/[qid]` practice, `.../compare`, `/stories`, `/privacy`, `/admin`) and API routes under `app/api/` (session, interviews, attempts, stories, competencies, points, events, admin, health, cron/retention).
- `modules/<name>/`: one folder per capability, each with a `README.md`: `session`, `interview`, `attempt`, `feedback`, `stories`, `discovery`, `prep`, `ai`, `events`, `admin`, `retention`.
- `lib/`: `env.ts` (the only place that reads `process.env`), `contracts.ts` (Zod schemas for every AI task), `db/` (Repo interface + memory and Supabase implementations), `audio.ts` (AudioStore), `text.ts` (quote location, sentence splitting), `http.ts`.
- `components/`: shared UI (`ui.ts` tokens, consent gate, delete-data button…).
- `supabase/migrations/`: `0001`–`0004`, applied in order.

**Key patterns**
- **Two switches:** `AI_MODE=mock|live` and `DATA_MODE=memory|supabase`. Mock + memory runs everything with no keys (dev, tests, demos); memory mode is refused on Vercel.
- **Repo interface:** all data access goes through `Repo` (`lib/db/types.ts`), implemented twice (`memory.ts`, `supabase.ts`). A new table or query means adding it to **both**.
- **Provider interfaces:** feature code calls `getLlm().run(task, input)` / `getStt().transcribe()`, never a vendor SDK. Each AI task has a Zod input/output contract in `lib/contracts.ts` and a prompt in `modules/ai/live/prompts.ts`. Output is validated; one corrective retry.
- **Verify after AI:** `locateQuote` (quotes must be verbatim), `looksLikeRewrite`, `findInventions` / `inventsClaims` (no new numbers, names or ownership claims), `verifyFollowup` (fixed fallback question). Anything that fails is dropped.
- **Every AI call through `withAiCall`:** reserves quota atomically (SQL `reserve_ai_call`), logs purpose, model, latency and tokens to `ai_calls`, **never content**.
- **Time budget:** one 45 s AI budget per request (routes have `maxDuration = 60`), shared by every call and retry.
- **Attempt state machine:** `created → uploaded → transcribing → transcribed → followup_ready → (followup_uploaded → followup_transcribed) → analysing → ready`, or `failed` (data kept; "Try again" resumes the missing step). Each step takes an exclusive lease (`processing_until`), so double clicks can't double-process. Feedback and "ready" are saved in one transaction (`save_feedback`).
- **Events:** an allow-list of event names (`modules/events`), small primitive props only, never user text; the browser may send only `CLIENT_EVENT_NAMES`.
- **Next.js 16 gotchas:** `cookies()` / `params` are async; anything reading request data or the clock must `await connection()`; request-dependent UI goes inside `<Suspense>`; middleware is called `proxy`. Read `node_modules/next/dist/docs/` before using a Next API.

**Data model** (Postgres, RLS on every table with **no policies**: only the server's service role can read or write)
`sessions` (token hash only) → `interviews` → `competencies`, `questions` → `attempts` (audio keys, words, transcript, follow-up, status, lease) → `feedback_points`, `feedback_metrics`, `point_ratings`. `stories`, `competency_map` (story or gap per competency). `events`, `ai_calls` (no content; kept but unlinked on delete), `rate_limits` (hashed keys). Audio objects are stored as `<sessionId>/<attemptId>/answer|followup`.

**Security and privacy rules for contributors**
- Secrets live only in `app/.env.local` (git-ignored) and Vercel's environment settings; `.env.example` lists names only. Never paste keys into chat, code or logs.
- Logs and errors never contain user text (JD, CV, stories, transcripts).
- User content goes to the model only inside `<data>` tags and is treated as untrusted.
- No real interviewee names or IDs from `research/` anywhere in the product.

**Environment variables:** `AI_MODE`, `DATA_MODE`, `LLM_PROVIDER`, `STT_PROVIDER`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_KEY`, `CRON_SECRET`; optional `LLM_MODEL_JUDGE`, `LLM_MODEL_FAST`, `AI_GLOBAL_DAILY_LIMIT`, `SESSION_STARTS_PER_HOUR`.

## 5. How to work on it

```bash
cd product/app
npm install
npm run dev          # mock AI + in-memory data, no keys needed
npm run verify       # lint + typecheck + unit tests + E2E (must be green before committing)
npx vercel deploy --prod   # production deploy (Vercel CLI, needs access to the Vercel project)
```

**Definition of done for a change:** tests added or updated (each bug gets a regression test); `npm run verify` green; module `README.md` updated; a new entry appended to `product/log.md` (never edit old entries); `product/STATUS.md` updated if the state changed; schema changes go in a new numbered migration and are added to both Repo implementations.

**Prompting tip:** attach this file plus the `README.md` of the module you're changing, and say which principle in section 1 the change must respect.

## 6. Deeper sources

- `product/01_prd.md`: problem, personas, goals, requirements (IDs like MF3, SB5, G2 referenced in code).
- `product/02_capability-and-architecture.md`: full capability contract, decisions and deviations.
- `product/03_build-plan.md` and `product/STATUS.md`: what was built, phase by phase, and what's open.
- `product/05_feedback-engine-explained.md`: plain-language guide to what the AI sees and when.
- `product/app/src/modules/*/README.md`: per-module behaviour and rules.
