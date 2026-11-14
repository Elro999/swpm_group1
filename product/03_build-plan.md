# 03: Build plan

**Status:** draft for team review · **Date:** 2026-11-13 · **Read first:** `01_prd.md` (what), `02_capability-and-architecture.md` (how).
Live progress is **not** tracked here. This file is the plan; `STATUS.md` is the live state; `log.md` is the history.

## Principles
1. **Vertical slices, core loop first.** After Phase 3 there is a usable product (JD → mock → pinned feedback → retry). Phases 4–6 add the rest. Phase 7 makes it public-ready.
2. **Mock mode always works.** `AI_MODE=mock` runs every flow with no keys, so tests, demos and handoffs never depend on secrets.
3. **Test first for logic, E2E per slice.** Guards and metrics get unit tests before code; each phase ends with an E2E that exercises its slice.
4. **Small commits, one task each**, message format `feat(mock): …` / `fix(...)`, on branch `dev/suraj-working` (or a child branch). Never commit `.env*`, audio, or real participant data.
5. **After every task:** update the module's `README.md`, `STATUS.md`, and append to `product/log.md` (and root `log.md` if other folders changed).
6. **Phase gate:** a phase is done only when its acceptance list passes, `npm run verify` is green (lint + typecheck + unit + e2e), and `STATUS.md` says so.

## Setup steps that need the user (not the agent)
| # | Step | Needed by | Notes |
|---|---|---|---|
| S1 | Create a free **Supabase** project; run `app/supabase/migrations/*.sql` in the SQL editor (no CLI needed; the migration also creates the private `audio` bucket) | Before any real-user deploy (feature work runs in `DATA_MODE=memory` until then) | Put URL and keys in `app/.env.local` yourself; **do not paste keys into chat** |
| S2 | Create a **Vercel** account and import the repo with **Root Directory = `product/app`** | Phase 7 | The GitHub repo is owned by a teammate; either they grant access, or deploy from a fork, or use the Vercel CLI from a local checkout. Decide who owns the Vercel project |
| S3 | Choose AI providers and create keys (Anthropic; OpenAI or Deepgram) | Phase 2 live mode | Default recommendation: Anthropic + OpenAI Whisper. Until then everything runs in mock mode |
| S4 | Pick an `ADMIN_KEY` (any long random string) | Phase 6 | Stored in env only |
| S5 | Agree consent wording and retention (Q2) | Phase 7 | Draft text is provided in Phase 1 |
| S6 | Name the teammate reviewer for each of the first 5 users (Q3) | Phase 7 | |

## Phase 0: Foundation (~1 h)
| ID | Task | Reqs | Done when |
|---|---|---|---|
| 0.1 | Scaffold Next.js (App Router, TS strict), Tailwind, ESLint, Vitest, Playwright; `npm run verify` | A1 | `npm run verify` passes on an empty app |
| 0.2 | Env loader with Zod; `.env.example`; `AI_MODE`; fail fast on missing vars in live mode | A3 | App boots in mock mode with no keys |
| 0.3 | SQL migration `0001_init.sql` for the data model in doc 02 §3, RLS on with no policies | A2 | Applies cleanly in Supabase SQL editor; schema comment per table |
| 0.4 | DB client (server-only), session creation/lookup, hashed token cookie, resume route | PF1 | Unit test: cookie round-trip; wrong token → 401 |
| 0.5 | `events` writer and `ai_calls` logger with a "no text in props" guard | PF3 | Unit test rejects props containing long strings |
| 0.6 | `LlmProvider` / `SttProvider` interfaces + mock providers + provider factory | A3 | Mock returns fixtures that satisfy the Zod schemas |
| 0.7 | `app/README.md` (run, env, scripts, structure) and module README template | handoff | Another agent can start the app from the README alone |

## Phase 1: Interview setup (~1 h)
| 1.1 | Landing page (`/`), start session, sample-JD button | PF1, PF6 | Click Start → session cookie → `/interviews/new` |
| 1.2 | `/interviews/new` with caps and validation messages | US-0.2, MF1 | Too-short JD shows the specific missing-input message |
| 1.3 | `POST /api/interviews`: competencies (quote-verified) + 3–5 questions | MF1 | Unit: competency quote must be a substring of the JD; E2E: hub shows questions |
| 1.4 | Interview hub `/i/[id]` shell (questions list, placeholders for map and prep list) | MF1 | |
| 1.5 | `/privacy` page and consent gate component (draft wording in file, flagged "needs team approval") | PF2 | Recording is impossible before consent |

## Phase 2: Core loop: mock and pinned feedback (~3 h) — usable product after this phase
| 2.1 | Recorder component (MediaRecorder, timer, 3:00 cap, permission errors, preview) | MF2 | Manual on Chrome + Safari + Android; E2E with fake mic |
| 2.2 | Signed upload + `attempts` create + status polling endpoint | MF2 | Audio object exists, row `uploaded` |
| 2.3 | Transcribe endpoint, word timestamps, status transitions, failure path | MF2 | Mock and live; failed step shows reason + retry |
| 2.4 | Follow-up generation with quote check; record follow-up (skippable) | MF3 | Unit: quote verifier; exactly one follow-up |
| 2.5 | Deterministic delivery metrics (time to decision, I/we, length) | MF4 | Unit tests on synthetic word lists incl. edge cases (empty, no decision) |
| 2.6 | Fit feedback via LLM + verifier (drop points without a valid quote; no-rewrite check) | MF5, G2 | Unit: fixtures with a fabricated quote are dropped and counted |
| 2.7 | Feedback screen: transcript with highlighted lines, points pinned to timestamps, click-to-play at that moment | MF4, MF5 | E2E asserts every shown point has a quote and a time |
| 2.8 | "Not useful" control and events (`first_feedback_viewed`, etc.) | MF7, PF3 | Row in `point_ratings`; event fired once |
| 2.9 | Live-mode adapters (Anthropic + chosen STT) behind the interfaces; 3 real recordings test (Q4) | Q1, Q4 | Needs S3. Record result and decision in `STATUS.md` and the log |
**Gate:** E2E (mock) green; manual live check done or explicitly marked "pending keys".

## Phase 3: Retry and compare (~1 h)
| 3.1 | Retry flow creating `attempt_no+1` for the same question | MF6 | |
| 3.2 | Compare function and `/compare` page: same checks, deltas, resolved / still-present | MF6, G6 | Unit tests on compare; E2E retry shows both columns |
| 3.3 | Events `retry_started`, `retry_feedback_viewed` | PF3 | |

## Phase 4: Story builder (~2 h)
| 4.1 | Paste stories → split → structure (decision first) with source spans | SB1, SB2 | Fixture stories (synthetic) round-trip in mock mode |
| 4.2 | **G-NO-INVENT guard** (numbers, entities, verb-strength) with unit tests | SB5, G5 | A fixture that adds "increased revenue 20%" is rejected |
| 4.3 | Team vs own sentence labels and "we"/unsupported-claim flags in UI | SB3 | |
| 4.4 | Competency-to-story map with gaps (`POST /api/interviews/:id/map`) | SB4, G3 | Every competency has a story or `is_gap` |
| 4.5 | Ready toggle, edit story (returns to `structured`), events | G4 | |

## Phase 5: Gap discovery and prep list (~1.5 h)
| 5.1 | Gap prompts from the CV (names must appear in CV) | SD1 | |
| 5.2 | Answer a prompt (text, optional voice) → draft story via the same guard | SD2 | Draft flagged "from your answer"; nothing invented |
| 5.3 | Prep list generator (deterministic scheduler over ready/not-ready stories + questions, 20-min blocks, date-aware) | PL1 | Unit tests on scheduling edge cases (date today, no stories) |
| 5.4 | List regenerates when a story is marked ready | PL2 | |

## Phase 6: Review, metrics, deletion (~1.5 h)
| 6.1 | `/admin` gate (`ADMIN_KEY`), read-only review queue: transcript, points + quotes, not-useful flags | PF4 | Unauthorised request → 401, tested |
| 6.2 | Metrics page with the 5 hypotheses (numerator, denominator, target, pass/fail) | PF5 | Unit tests on metric SQL / functions using seeded synthetic events |
| 6.3 | `DELETE /api/session` removing rows and audio; confirmation UI | PF2 | E2E: after delete, resume link 404 |
| 6.4 | `session_returned` event on 12 h+ gap | PF3 | |
| 6.5 | Body-language fake door (log-only button) if the team says yes (Q7) | P1 | |

## Phase 7: Hardening, deploy, user testing (~2 h)
| 7.1 | Quotas and input caps, friendly error pages, loading and empty states | C5 | Abuse test: quota stops the 41st AI call |
| 7.2 | Accessibility pass (keyboard, labels, contrast, recorder state announced) | quality | Lighthouse a11y ≥ 90 on main flow |
| 7.3 | `ecc:security-review` pass (secrets, RLS, cookie flags, signed URLs, prompt injection) | C5 | Findings fixed or logged |
| 7.4 | Deploy to Vercel (root `product/app`), set env, smoke test on phone | S2 | Public URL works end to end in live mode |
| 7.5 | Teammate review of first 5 sessions; fix top issues; evaluate metrics (PRD §7) | G5 | Review notes appended to `log.md` (no participant names) |
| 7.6 | Final handoff: `STATUS.md`, module READMEs, known-issues list, demo script | handoff | A fresh agent completes the "Start here" steps in `STATUS.md` |

## Effort and cuts
Estimates are agent-assisted build hours, not calendar time, and assume keys and accounts are ready: **core loop (Phases 0–3) ≈ 6 h; everything ≈ 13 h.** The deck's budget is 8–10 h, so if time is short, **cut in this order, each cut written into `STATUS.md` and the log:** 6.5 fake door → 5.3–5.4 prep list → 5.1–5.2 gap discovery → richer admin views (keep the review queue and the 5 metrics). Do not cut G1, G2, G5, mock mode, or consent.

## Agent working protocol (applies to every agent and person)
1. Read, in order: root `instructions.md`, `product/instructions.md`, `product/STATUS.md`, then the PRD/architecture sections you need.
2. Work one task at a time from the table above; write the failing test first for logic tasks.
3. Run `npm run verify` before declaring a task done. Never mark done with failing or skipped tests; if something is skipped, say so in `STATUS.md`.
4. Update `STATUS.md` (current phase, what changed, next task, blockers) and append a log entry **in the same commit** as the code.
5. If you change a contract (`lib/contracts.ts`), a table, a guard, or a product rule, also update docs 01/02 and log **why**.
6. Never put real names, emails, employers, recordings, or keys in the repo, fixtures, logs or prompts.
