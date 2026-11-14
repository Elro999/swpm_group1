# lib/db

**Purpose:** one data-access contract (`Repo`) with two implementations, chosen by `DATA_MODE`.

| File | Role |
|---|---|
| `types.ts` | The `Repo` interface and row types (camelCase mirrors of the SQL tables) |
| `memory.ts` | In-process store for dev, tests and demos. `createMemoryRepo()` makes an isolated instance (tests); `sharedMemoryRepo()` is the per-process singleton kept on `globalThis` so dev hot reload keeps data. Rows are deep-copied in and out |
| `supabase.ts` | Postgres via `@supabase/supabase-js` with the **service-role key, server-only**. Maps snake_case columns. Throws on any error with no row content in the message |
| `index.ts` | `getRepo()`: picks the implementation from `getEnv().DATA_MODE` |

## Sub-repos implemented
| Sub-repo | Since | Notes |
|---|---|---|
| `sessions` | Phase 0 | create, findByTokenHash, touch, setConsent, delete (cascade) |
| `events`, `aiCalls` | Phase 0 | insert, list (metadata only, never user text) |
| `interviews` | Phase 1 | create, **findForSession** (ownership enforced in the query), listBySession (newest first), delete (cascade) |
| `competencies`, `questions` | Phase 1 | insertMany, listByInterview (by `ord`); `questions.findById` (caller must check ownership via the interview) |
| `attempts` | Phase 2 | create (unique per question + attempt_no), findById, listByQuestion, update(patch); needs migration `0002_attempt_fields.sql` |
| `feedback` | Phase 2 | save (replaces metrics + points for an attempt), get, findPoint |
| `pointRatings` | Phase 2 | set (upsert), listByPoints |
| `stories` | Phase 4 | create, **findForSession**, listBySession (oldest first), update(patch). Supabase stores field text in `situation/decision/result` and offsets in `spans` jsonb |
| `interviews.setCv`, `competencies.findById` | Phase 5 | CV for gap prompts; competency lookup (caller checks ownership via the interview) |
| `competencyMap` | Phase 4 | replace (all rows for an interview's competencies), listByCompetencies; "story or gap" check enforced in both implementations; migration `0003` makes story deletes cascade |
Ownership for attempts, feedback and ratings is checked in `modules/attempt/service.ts` (attempt → question → `interviews.findForSession`), not in the repo.

## Rules
- The browser never talks to Supabase. RLS is on for every table with no policies (see `supabase/migrations/0001_init.sql`).
- Adding a table or method: SQL migration (new numbered file), `types.ts`, **both** implementations, and a memory-repo test.
- Every row belongs to a session (`ON DELETE CASCADE`), so deleting the session deletes the user's data. Keep it that way for new tables.

## Status
`memory.ts` is tested. `supabase.ts` and the migration are **written but not yet run against a real project** (waiting on setup S1; no local Postgres on the build machine). First task after S1: apply the migration, run the app with `DATA_MODE=supabase`, and smoke-test session start and resume.
