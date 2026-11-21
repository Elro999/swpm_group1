# Local setup guide (for a new Claude instance or teammate)

*How to clone the project, run it locally, configure `.env.local`, test, and avoid the known traps. Written so an AI coding agent can follow it step by step. Last checked: 21 Nov 2026.*

> **Prompt for a fresh Claude session:**
> "Clone https://github.com/Elro999/swpm_group1, then read and follow `product/07_local-setup-guide.md`. Start in mock mode, run `npm run verify`, and tell me when it's green. Don't ask me to paste any keys into chat."

---

## 0. Rules before you touch anything

1. **Read in this order:** `CLAUDE.md` → `instructions.md` (repo root) → `product/instructions.md` → `product/STATUS.md` → `product/06_product-engineering-context.md`. Then the `README.md` of any module you change (`product/app/src/modules/<name>/README.md`).
2. **Logs are append-only.** Every change gets a new entry at the bottom of that folder's `log.md`; never edit old entries.
3. **Secrets never go in chat, code, commits or logs.** Keys live only in `product/app/.env.local` (git-ignored) and in Vercel's settings. An agent must **never ask the user to paste a key into chat**. Instead, create the file with blank values and ask the user to fill them in themselves (see §4).
4. **Privacy:** never copy real interviewee names or IDs from `research/` or the Assignment 2 deck into the product, docs or test data.
5. **Branches:** work on your own branch (`dev/<your-name>-working`). Commit or push only when the human asks.

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Git | any recent | `git --version` |
| Node.js | **≥ 20.9** (built and tested on 25.8) | `node -v` |
| npm | comes with Node | `npm -v` |
| Google Chrome | for manual testing (the E2E tests install their own Chromium) | — |

**nvm trap:** if Node was installed with nvm, a new terminal (or a Claude tool's shell) may not have `node`/`npx` on its PATH ("command not found: npx"). Fix it for that shell:
```bash
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin:$PATH"
```
or run `nvm use` if your shell loads nvm.

## 2. Get the code

```bash
git clone https://github.com/Elro999/swpm_group1.git
cd swpm_group1
git fetch origin
git checkout dev/suraj-working        # latest product code until it is merged into main
git checkout -b dev/<your-name>-working
```
Once `dev/suraj-working` has been merged, branch from `main` instead.

## 3. Install

```bash
cd product/app
npm ci                                # exact versions from package-lock.json
npx playwright install chromium       # browser for the E2E tests (one-off, ~150 MB)
```

## 4. `.env.local`: how it works and how to fill it

**What it is:** `product/app/.env.local` holds this machine's settings and secrets. Next.js loads it automatically for `npm run dev`, `npm run build` and `npm start`. It is git-ignored (`.env*` except `.env.example`), so it never reaches GitHub or Vercel. Vercel keeps its own copy of the production values in its project settings.

**Rules for how it is read:**
- **You don't need it at all for mock mode.** With no `.env.local`, the app runs with mock AI and in-memory data.
- **Restart the server** after editing it; values are read at start-up.
- **Real environment variables win:** a variable already set in the shell (or in the Playwright config) overrides `.env.local`. This is why the E2E tests always run in mock mode, even when `.env.local` holds live keys.
- **Empty means unset:** `OPENAI_API_KEY=` counts as not set.
- **Bad values stop the server:** a missing required key (for example live mode without `OPENAI_API_KEY`) stops the server with a message that names the variable but never prints any value.

**Create it:**
```bash
cd product/app
cp .env.example .env.local
chmod 600 .env.local                  # readable only by you
```

**Variables:**

| Variable | Needed when | Value / where to get it |
|---|---|---|
| `AI_MODE` | always (default `mock`) | `mock` = scripted AI, free, no keys. `live` = real OpenAI calls (costs money). |
| `DATA_MODE` | always (default `memory`) | `memory` = data in the server's memory, lost on restart. `supabase` = real database and file storage. |
| `LLM_PROVIDER` / `STT_PROVIDER` | live mode | `openai` (the only one implemented). |
| `OPENAI_API_KEY` | `AI_MODE=live` | platform.openai.com → API keys. Ask the project owner for a team key, or use your own. |
| `SUPABASE_URL` | `DATA_MODE=supabase` | Supabase dashboard → Project Settings → API (looks like `https://<ref>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | `DATA_MODE=supabase` | Same page, the **secret / service_role** key (not anon or publishable). Server-only; bypasses all database security, so guard it. |
| `ADMIN_KEY` | to use `/admin` locally | Any random string of 16+ characters: `openssl rand -hex 16`. |
| `CRON_SECRET` | to test `/api/cron/retention` | Random string: `openssl rand -hex 24`. Unset = the route returns 503. |
| `LLM_MODEL_JUDGE` / `LLM_MODEL_FAST` | optional | Override the default models (`gpt-6.1-sol` / `gpt-6-luna`). |
| `AI_GLOBAL_DAILY_LIMIT` | optional | Site-wide AI calls per 24 h (default 1500). |
| `SESSION_STARTS_PER_HOUR` | optional | New sessions per network per hour (default 60). Locally every request counts as one network, so raise it if you create many sessions while testing. |
| `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY` | not used | Placeholders for providers that aren't implemented. |
| `VERCEL_OIDC_TOKEN` | never set by hand | `vercel link` adds it automatically; harmless. |

**How an AI agent should handle secrets:**
1. Generate non-secret values itself (`ADMIN_KEY`, `CRON_SECRET`) with `openssl` and write them straight into the file, without printing them.
2. Leave `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` blank, then tell the human: "Open `product/app/.env.local` and paste your keys after the `=`."
3. Check the result without revealing values, for example:
   ```bash
   for k in OPENAI_API_KEY SUPABASE_SERVICE_ROLE_KEY; do v=$(grep -E "^$k=" .env.local | cut -d= -f2-); echo "$k length=${#v}"; done
   ```

### Pick a setup

| Setup | `.env.local` | Use it for | Cost / risk |
|---|---|---|---|
| **A. Mock + memory** (default) | none needed | Almost all development, UI work, tests | Free; nothing leaves your machine |
| **B. Live AI + memory** | `AI_MODE=live`, `LLM_PROVIDER=openai`, `STT_PROVIDER=openai`, `OPENAI_API_KEY` | Checking real AI quality (questions, follow-ups, feedback) | A few cents per practice round; data lost on restart |
| **C. Live AI + Supabase** | setup B, plus `DATA_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Testing database or storage code, migrations, retention, delete-my-data | Writes real rows and files |

**Use your own Supabase project for setup C.** The project behind the live site (`interview-prep-companion`) **is production**: test rows there show up in `/admin` metrics and count toward the site-wide AI cap. To create your own:
1. Create a free Supabase project (any region; Mumbai `ap-south-1` matches production).
2. In the SQL editor, run the migrations **in order**: `product/app/supabase/migrations/0001_init.sql`, `0002_…`, `0003_…`, `0004_review_fixes.sql`. They are not applied automatically. `0001` also creates the private `audio` storage bucket.
3. Put that project's URL and service-role key in `.env.local`.

## 5. Run it

```bash
cd product/app
npm run dev                  # http://localhost:3000, hot reload
```
- Check which modes are active: http://localhost:3000/api/health → `{"aiMode":"mock","dataMode":"memory",…}`.
- **Production-like run:** `npm run build && npm start` (port 3000). Builds are stricter than dev and match Vercel, so run one before deploying.
- **Cookie nuance:** in a production build the session cookie (`ipc_session`) is marked `Secure`. Chrome accepts it on `http://localhost`; some other browsers don't, so use Chrome for `npm start` testing.
- **Don't run `next dev` and a build at the same time;** both use the `.next/` folder. Stop the dev server before `npm run build` or the E2E tests.

## 6. Test

```bash
cd product/app
npm run verify               # lint + typecheck + unit + E2E: must be green before any commit
```
Expected now: 161 unit tests and 23 E2E tests, taking about 2 minutes.

| Command | What it runs | Notes |
|---|---|---|
| `npm run lint` | ESLint | |
| `npm run typecheck` | `next typegen` + `tsc` | Regenerates route types first |
| `npm test` | Vitest unit tests (`src/**/*.test.ts`) | One file: `npx vitest run src/modules/feedback` |
| `npm run e2e` | Playwright | Builds a production server on **port 3100** (must be free), always **mock + memory**, one worker, Chromium. One spec: `npx playwright test e2e/smoke.spec.ts` |

**E2E nuances:**
- **No microphone needed:** specs that record use a fake microphone (`e2e/fixtures/fake-mic.ts`), because Chromium's own fake-device flag hung on the build machine.
- **Production build on purpose:** with `next dev`, early clicks landed before the page was interactive. Buttons stay disabled until the page has loaded fully (`useHydrated`).
- **On failure:** a trace is kept in `test-results/`. Open it with `npx playwright show-trace <path>`.

## 7. Manual testing tips

- **Fastest path:** home → **Try with a sample JD** → hub → pick a question → agree to the recording notice → record a few seconds → follow-up → feedback.
- **Mock mode ignores what you say:** every first recording returns the same scripted answer (with a late decision and lots of "we"), and a retry returns an improved one, so before/after comparison always has something to show. Use live mode (setup B) to test real speech.
- **Testing live speech without a microphone (macOS):**
  ```bash
  say -o answer.m4a --data-format=aac "In my last internship I decided to ..."
  ```
  Upload it to `POST /api/attempts/<id>/answer` with `Content-Type: audio/mp4`. To get a session, call `POST /api/session/start`, keep the `ipc_session` cookie, then call `POST /api/session/consent`.
- **Admin:** open `/admin` and enter your `ADMIN_KEY` to see the review queue and metrics.
- **Delete my data:** use `/privacy` or any interview page. Afterwards your private link stops working.
- **Retention job:**
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/retention
  ```
  Expect `401` without the header, `503` when `CRON_SECRET` is unset, and `200 {"deleted":N}` otherwise. It deletes only recordings older than 30 days.
- **Limits you may hit while testing:**
  - 80 AI calls per session per day: you'll see a 429 "practice limit". Start a new session, or use memory mode and restart.
  - 60 new sessions per hour per network: locally that's everyone on your machine. Raise `SESSION_STARTS_PER_HOUR`.
  - Two clicks at once on the same answer: the second gets a 409 "still being processed". This is intended.

## 8. Nuances and gotchas

**Framework (Next.js 16 is not the Next.js most models know):**
- Read `product/app/AGENTS.md` and the guides in `node_modules/next/dist/docs/` before using any Next API.
- `cookies()` and `params` are async. Middleware is now called `proxy`.
- `cacheComponents` is on: anything that reads cookies, request data or the clock must `await connection()`, or be rendered inside `<Suspense>`. Otherwise the build prerenders it, or fails with "used `new Date()` during prerender".

**Architecture rules:**
- All data goes through the `Repo` interface. A new table or query must be added to **both** `lib/db/memory.ts` and `lib/db/supabase.ts`.
- Schema changes go in a **new numbered migration**; never edit an applied one. Apply it to every Supabase project by hand, and record it in `product/log.md`.
- All AI goes through `getLlm()` / `getStt()` and `withAiCall`. Never call OpenAI directly from feature code.
- Each AI task has a Zod contract (`lib/contracts.ts`) and a prompt (`modules/ai/live/prompts.ts`); change both together.
- `env.ts` is the only file that reads `process.env`. New variables go in its schema and in `.env.example` (names only).
- Events must be on the allow-list in `modules/events/events.ts`. Never put user text in events or logs.

**Live AI:**
- **Time budget:** each request gets 45 s of AI time. Routes have `maxDuration = 60`.
- **Speech-to-text model:** `whisper-1` is deprecated but supports word timestamps until **26 Feb 2027**. Plan the switch before then.
- **Safari/iPhone recordings:** they arrive as `audio/mp4` and must be sent to OpenAI named `.m4a`; it rejects `.mp4`. This is already handled.
- **Ownership checks are off in mock mode:** the mock AI never invents, so invention checks (`inventsClaims`) only matter in live mode. Test new prompts in live mode.

**Memory mode:** data lives in the server process, so every restart wipes it, and it's refused on Vercel. Use Supabase anywhere data must survive.

**Deployment** (only if you have access to the Vercel project):
- The site is deployed with the Vercel CLI from `product/app`: run `npx vercel deploy --prod`.
- The project is **not connected to GitHub**, so pushing does not deploy.
- Production settings live in Vercel's dashboard, not in your `.env.local`.
- `vercel link` writes a `.vercel/` folder and a `VERCEL_OIDC_TOKEN` line into `.env.local`; both are git-ignored.

**Claude Code hooks:** some setups run hooks (for example a "Fact-Forcing Gate") that block the first edit to a file until the agent states what it is changing and why. Answer it briefly and retry. This comes from the user's own Claude configuration, not this repo.

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `command not found: npx` | Node not on PATH (nvm) | See §1 |
| Server stops with "Invalid environment configuration (missing: …)" | Live or Supabase mode without its keys | Fill in the named variables, or switch back to mock/memory |
| `/api/health` still shows `mock` after editing `.env.local` | Server not restarted, or the variable is also set in your shell | Restart; `unset AI_MODE` |
| E2E: "port 3100 already in use" | An old server is still running | Stop it, or run `E2E_PORT=3200 npm run e2e` |
| Build fails: "used `new Date()`/cookies during prerender" | Request-time code outside `connection()`/`<Suspense>` | See §8, Framework |
| Clicks do nothing in tests | Page not interactive yet | Wait for the button to be enabled; don't remove `useHydrated` |
| 429 on every AI step | Daily quota reached | New session, or restart memory mode |
| Live transcription fails with HTTP 400 | Unsupported audio format or name | Allowed formats: webm, mp4/m4a, ogg, mpeg, wav, aac |
| Supabase "function … does not exist" | Migration `0004` not applied to that project | Run the migrations in order (§4) |

## 10. Before you finish a change

- [ ] `npm run verify` is green.
- [ ] Tests were added or updated (every bug gets a regression test).
- [ ] The module `README.md` is updated, and `product/06_product-engineering-context.md` too if a feature or pattern changed.
- [ ] A new entry is appended to `product/log.md` (and the root `log.md` for root files), and `product/STATUS.md` is updated if the state changed.
- [ ] No `.env*` file (other than `.env.example`), key or personal name is in `git diff --cached`.
- [ ] Commit only when asked. Commits end with the co-author line your tool requires.
