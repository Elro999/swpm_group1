# Interview Prep Companion: web app

The MVP1 web product described in `../01_prd.md`, built to `../02_capability-and-architecture.md`, in the order of `../03_build-plan.md`. **Current progress lives in `../STATUS.md`.**

## Run it (no accounts or keys needed)
```bash
cd product/app
npm install
npm run dev            # http://localhost:3000  (mock AI, in-memory data)
```
Check the active modes at `http://localhost:3000/api/health`.

## Scripts
| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Unit tests (Vitest), `src/**/*.test.ts` |
| `npm run e2e` | E2E tests (Playwright, `e2e/`); builds the app and serves it (`next build && next start`) on port 3100 in mock + memory mode, one worker. Recording specs use a microphone test double (`e2e/fixtures/fake-mic.ts`). First time only: `npx playwright install chromium` |
| `npm run verify` | lint + typecheck + unit + e2e. **Must be green before a task is marked done** |

## Configuration
Copy `.env.example` to `.env.local` (never commit it; never paste keys into chat). With nothing set you get:
- `AI_MODE=mock`: deterministic mock LLM and speech-to-text, derived from your input text, so every flow works without keys.
- `DATA_MODE=memory`: in-process store, lost on restart. Refused on Vercel, where `DATA_MODE=supabase` is required.

To use Supabase: create a project, paste each file in `supabase/migrations/` (in order: `0001_…`, `0002_…`, `0003_…`) into the SQL editor and run it, then set `DATA_MODE=supabase`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
Live AI (`AI_MODE=live`) is implemented in build-plan task 2.9; until then it fails fast with a clear message.

## Structure
```
src/
  app/                    Next.js routes (App Router). Route handlers are thin: parse → call a module → respond.
    page.tsx              Landing (/): value line, Start / sample-JD buttons, ContinueList for returning visitors
    interviews/new/       Add an interview: JD (required), date and CV (optional)
    i/[id]/               Interview hub: questions with JD quotes + Practise links (after consent), competencies, resume link
    i/[id]/mock/[qid]/    Practise one question: record → follow-up → pinned feedback → try again (MF2–MF7)
    …/[qid]/compare/      Before vs after across attempts of that question (MF6, G6)
    stories/              Story bank: paste, decision-first cards, team vs own, ready/edit (SB1–SB5)
    admin/, admin/s/[sid]/  Team only: metrics + review queue; one session's transcripts, quotes and flags (PF4, PF5)
    api/admin/{login,logout,metrics}/  Admin key → HMAC cookie; metrics JSON (401 without it)
    api/session/ (DELETE) "Delete my data": recordings + every row, cookie cleared (PF2)
    privacy/              Privacy notice (DRAFT wording, needs team approval: PRD Q2)
    api/health/           GET: active modes, never secrets
    api/session/start/    POST: anonymous session + resume path (PF1)
    api/session/consent/  POST: record consent before any recording (PF2)
    api/interviews/       POST: JD → verified competencies + questions (MF1)
    api/events/           POST: client-only view events, allow-listed (PF3)
    api/attempts/…        Attempt lifecycle: create, view, answer/followup audio, skip, resume, viewed, audio playback
    api/points/[id]/rate/ POST: mark a feedback point not useful (MF7)
    api/stories/…         POST paste stories; PATCH :id ready / edit (SB1–SB5)
    api/interviews/[id]/map/ POST: match stories to the role's competencies, gaps flagged (SB4, G3)
    api/interviews/[id]/cv/  POST: save the CV used for gap prompts (SD1)
    api/competencies/[id]/{prompts,draft-story}/  POST: CV-based prompts; answer → draft story that fills the gap (SD1, SD2)
    r/[token]/            GET: resume link → sets cookie → home
  components/             Shared UI: ui.ts class strings, StartButtons, ConsentGate, Recorder, MatchStoriesButton, GapDiscovery, TrackView, ResumeLink
  lib/
    env.ts                The only reader of process.env; validates modes and required keys
    contracts.ts          Zod schemas for every AI output (source of truth for shapes)
    text.ts               Sentence splitting, verbatim quote helpers (locateQuote = "no quote, no claim")
    http.ts               Route helpers: requireSession, readJson (size cap), json/jsonError
    client.ts             Browser helpers: postJson, ensureSession, trackEvent
    ids.ts · sample.ts    UUID check for URL ids · synthetic sample JD
    audio.ts              AudioStore (memory | Supabase Storage private bucket), size and type limits
    useHydrated.ts        Keeps buttons disabled until React has attached their handlers
    db/                   Repo interface + memory and Supabase implementations  → db/README.md
  modules/                Feature logic, framework-free where possible, each with a README
    session/              Tokens, sessions, cookie glue                          → session/README.md
    events/               Analytics events with the no-user-text guard          → events/README.md
    ai/                   Provider interfaces, factory, mocks, ai_calls logging  → ai/README.md
    interview/            JD validation, quote verifiers, interview creation     → interview/README.md
    attempt/              Practice attempt state machine, views, ratings         → attempt/README.md
    feedback/             Timed transcript, delivery metrics, pinning, guards    → feedback/README.md
    stories/              Story bank, G-NO-INVENT guard, competency matching     → stories/README.md
    discovery/            Gap prompts from the CV, answer → draft story          → discovery/README.md
    prep/                 Derived prep list (20-minute blocks)                    → prep/README.md
    admin/                Team review queue and MVP metrics (ADMIN_KEY)          → admin/README.md
  test/                   Synthetic fixtures (never real participant data) and test stubs
e2e/                      Playwright specs
supabase/migrations/      SQL applied in order in the Supabase SQL editor
```

## Conventions
- **Next.js 16** has breaking changes from older versions (see `AGENTS.md`): request APIs (`cookies()`, `params`) are async; `middleware` is now `proxy`; with `cacheComponents` on, a route handler that reads nothing request-specific is **prerendered at build time**. Call `await connection()` in such handlers (see `api/health`). Read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **Pages that read the cookie or dynamic params** keep a static shell and do that work in an async server component **inside `<Suspense>`** (see `app/page.tsx` → `ContinueList`, `app/i/[id]/page.tsx` → `InterviewHub`). Consequence: `notFound()` inside that boundary shows the not-found UI with `noindex` but the HTTP status is already 200.
- **Ownership:** every lookup of user data goes through a session-scoped repo method (e.g. `interviews.findForSession`). Never fetch by id alone for anything a user owns.
- **Client vs server events:** the browser may only send `CLIENT_EVENT_NAMES` (views/clicks). Outcome events (e.g. `first_feedback_viewed`) are recorded on the server.
- **Recording UI must render inside `ConsentGate`**, and any recording API must also check `session.consentAt` on the server.
- New data access: add the method to `lib/db/types.ts` and implement it in **both** `memory.ts` and `supabase.ts`; add a SQL migration for schema changes (never edit an applied migration; add `0002_…`).
- New AI task: add its input/output to `LlmTaskMap` and `LLM_TASKS` in `lib/contracts.ts`, a mock handler in `modules/ai/mock/llm.ts`, and a verifier for every quote it returns.
- Logic gets a failing unit test first; each user-facing slice gets an E2E spec.
- **Interactive client buttons** use `useHydrated()` and stay disabled until hydrated, so early taps on slow devices are never silently lost.
- **Server components that read the clock** (`new Date()`) must `await connection()` first, or Next 16 rejects them during prerender (see `InterviewHub`, `ContinueList`).
- **E2E runs on a production build**, not `next dev`: dev compiles routes on first request, which caused flaky clicks and aborted requests.
- After each task: update the module README, `../STATUS.md`, and append to `../log.md`.
