# Local setup guide (for a new Claude instance or teammate)

*How to get the project onto your machine, choose the right branch, fill in `.env.local`, run and test it, and avoid the known traps. Written so an AI coding agent can follow it step by step, asking the human at each decision. Last checked: 22 Nov 2026.*

> **Prompt for a fresh Claude session:**
> "Clone https://github.com/Elro999/swpm_group1 into a folder I choose, then read and follow `product/07_local-setup-guide.md`. Ask me before choosing or creating a branch, and never ask me to paste keys into chat."

---

## 0. Rules before you touch anything

1. **Ask, don't assume.** Ask the human before choosing a branch, creating one, switching to live mode, or touching a shared database.
2. **Read in this order** once the code is on disk: `CLAUDE.md` → `instructions.md` (repo root) → `product/instructions.md` → `product/STATUS.md` → `product/06_product-engineering-context.md`. Then the `README.md` of any module you change (`product/app/src/modules/<name>/README.md`).
3. **Logs are append-only.** Every change gets a new entry at the bottom of that folder's `log.md`; never edit old entries.
4. **Secrets never go in chat, code, commits or logs.** Keys live only in `product/app/.env.local` (git-ignored) and in Vercel's settings. The human pastes them into the file themselves (§5).
5. **Privacy:** never copy real interviewee names or IDs from `research/` or the Assignment 2 deck into the product, docs or test data.
6. **Commit or push only when the human asks.**

## 1. How it runs online vs on your machine

The same code runs in both places; only **where its settings come from** changes.

| | Online (the live site) | On your machine |
|---|---|---|
| Where it runs | Vercel, Mumbai region (`bom1`), https://interview-prep-companion.vercel.app | `npm run dev` on http://localhost:3000 |
| Where keys and settings live | Vercel project → Settings → Environment Variables (stored hidden) | `product/app/.env.local` on your disk (never committed) |
| AI | OpenAI (language model + Whisper speech-to-text), using the key stored in Vercel | **Mock AI by default** (free, scripted); real OpenAI only if you add a key and set `AI_MODE=live` |
| Data | Supabase (Postgres + private `audio` file storage), Mumbai | **In-memory by default** (wiped on restart); a Supabase project only if you add its URL and key |
| How it gets updated | Someone with Vercel access runs `npx vercel deploy --prod` from `product/app`. Pushing to GitHub does **not** deploy | You edit code; the dev server reloads |

The variable names are the same in both places (`AI_MODE`, `OPENAI_API_KEY`, `SUPABASE_URL`, …). `.env.local` is the local copy of what Vercel holds online, and you only need the parts for the mode you want.

## 2. Check the tools are installed

Run these and fix anything missing before going further:

```bash
git --version
node -v        # must be 20.9 or newer (built and tested on 25.8)
npm -v
```

| Missing | Install |
|---|---|
| Git | macOS: `xcode-select --install`; Windows: git-scm.com |
| Node.js + npm | nodejs.org (LTS), or `nvm install --lts` |
| Chrome | Recommended for manual testing; the automated tests install their own browser |

**nvm trap:** if Node was installed with nvm, a new terminal (or a Claude tool's shell) may say `command not found: npx`. Fix it for that shell:
```bash
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin:$PATH"
```
or run `nvm use` if your shell loads nvm.

## 3. Get the code and choose a branch

**3.1 Clone** (ask the human which folder to clone into):
```bash
git clone https://github.com/Elro999/swpm_group1.git
cd swpm_group1
git fetch --all --prune
```
If the repo is already on the machine, `cd` into it and run `git fetch --all --prune` instead.

**3.2 Find where the latest working code is.** Don't assume it's on `main`, or on any particular branch. Look first:
```bash
# every branch, newest commit first, with date, author and message
git for-each-ref --sort=-committerdate refs/remotes/origin \
  --format='%(committerdate:short)  %(refname:short)  %(authorname)  %(subject)'

# does a branch contain the app, and what changed recently?
git ls-tree -d --name-only origin/main product/app
git log --oneline -8 origin/<branch>

# how far a branch is ahead of / behind main
git rev-list --left-right --count origin/main...origin/<branch>
```

**3.3 Tell the human what you found, then ask.** Summarise in a few lines:
- which branches exist, and the date and message of their latest commit;
- which branches contain `product/app/` (the web app);
- how far each is ahead of or behind `main`, and whether `main` already has the app.

Give a suggestion, for example "`main` has the app and is up to date, so start there", or "`<branch>` is 12 commits ahead of `main` and holds the newest app code". Then ask: **"Which branch should I start from?"**

**3.4 Ask how they want to work:**
- **Just run or test it:** check out the chosen branch and stay on it:
  ```bash
  git checkout <branch>        # e.g. main
  git pull
  ```
- **Develop changes:** ask **"What should I call your working branch?"** (suggest `dev/<your-name>-working`), then create it from the chosen branch:
  ```bash
  git checkout <branch> && git pull
  git checkout -b <new-branch-name>
  ```

All the setup below happens on whichever branch you end up on. If you switch branches later, rerun `npm ci` (dependencies may differ); `.env.local` stays where it is.

## 4. Install dependencies

```bash
cd product/app
npm ci                                # exact versions from package-lock.json (use `npm install` only if ci fails)
npx playwright install chromium       # browser for the automated E2E tests (one-off, ~150 MB)
```
If `product/app/` doesn't exist, the branch has no app code. Go back to §3.3 and pick another branch.

## 5. Set up `.env.local`

### 5.1 Decide what you need

| Setup | What it does | Keys needed | Use it for |
|---|---|---|---|
| **A. Mock + memory** (default) | Scripted AI, data in memory | **None**; you can skip `.env.local` | Most development, UI work, tests. Free |
| **B. Live AI + memory** | Real OpenAI, data in memory | `OPENAI_API_KEY` | Checking real questions, follow-ups and feedback. A few cents per practice round |
| **C. Live AI + Supabase** | Real OpenAI and a real database | `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database or storage work, delete-my-data, retention |

Ask the human which one they want. If unsure, start with **A**: it needs nothing and everything runs.

### 5.2 Create the file from the template (agent does this)

```bash
cd product/app
cp .env.example .env.local
chmod 600 .env.local                  # readable only by you
```
The agent then sets the mode lines for the chosen setup and generates the two local-only passwords, writing them straight into the file without printing them:
```bash
sed -i.bak "s/^ADMIN_KEY=.*/ADMIN_KEY=$(openssl rand -hex 16)/" .env.local && rm .env.local.bak
grep -q '^CRON_SECRET=' .env.local || echo "CRON_SECRET=$(openssl rand -hex 24)" >> .env.local
```

### 5.3 The human pastes the team's keys (agent guides, never sees them)

Your team keeps the real values (OpenAI key, Supabase URL and service-role key) somewhere private, such as a password manager or a direct message from the project owner. The agent's instruction to the human is:

> "Open `product/app/.env.local` in your editor. For each line below that ends in `=` with nothing after it, paste the value from your team's shared secrets right after the `=` (no spaces, no quotes), then save."

For setup C, the filled-in file looks like this (values shown as `…`):
```dotenv
# --- Modes ---
AI_MODE=live
DATA_MODE=supabase
STT_PROVIDER=openai

# --- Supabase ---
SUPABASE_URL=https://…….supabase.co        ← paste
SUPABASE_SERVICE_ROLE_KEY=sb_secret_……      ← paste (the secret/service_role key, not anon/publishable)

# --- AI providers ---
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-……                         ← paste
LLM_MODEL_JUDGE=                             (leave empty = default model)
LLM_MODEL_FAST=                              (leave empty = default model)
ANTHROPIC_API_KEY=                           (not used, leave empty)
DEEPGRAM_API_KEY=                            (not used, leave empty)

# --- Admin and jobs ---
ADMIN_KEY=……                                 (generated in 5.2)
CRON_SECRET=……                               (generated in 5.2)
AI_GLOBAL_DAILY_LIMIT=                       (optional, default 1500)
SESSION_STARTS_PER_HOUR=                     (optional, default 60)
```
For setup B, paste only `OPENAI_API_KEY`, and keep `DATA_MODE=memory` and the Supabase lines empty. For setup A, change nothing.

**The agent checks the result without revealing any value:**
```bash
for k in AI_MODE DATA_MODE OPENAI_API_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ADMIN_KEY; do
  v=$(grep -E "^$k=" .env.local | cut -d= -f2-); echo "$k: ${#v} characters"; done
```
`0 characters` on a line that setup needs means it still has to be filled.

**If the team has no keys to share:**
- **OpenAI:** create a key at platform.openai.com → API keys (and set a spend limit).
- **Supabase (setup C):** create your own free Supabase project, then run the four migrations **in order** in its SQL editor: `supabase/migrations/0001_init.sql` → `0002_…` → `0003_…` → `0004_review_fixes.sql`. They aren't applied automatically, and `0001` also creates the private `audio` bucket. Copy its URL and **secret/service_role** key from Project Settings → API.

> ⚠️ **The team's Supabase project is the live site's database.** Anything you do locally in setup C with the team's keys writes real rows: they appear in `/admin` metrics and count toward the site-wide AI cap. For heavy testing, use your own Supabase project.

### 5.4 How the file is read
- **Next.js loads it automatically** for `npm run dev`, `npm run build` and `npm start`. **Restart the server after editing it.**
- **Shell variables win:** a variable already set in your terminal (or in the test config) overrides the file. This is why the automated tests always use mock mode.
- **Empty means unset.** A missing key that the chosen mode needs stops the server with a message that names the variable but never prints a value.
- **Every variable:**

| Variable | Meaning |
|---|---|
| `AI_MODE` | `mock` (default) or `live` |
| `DATA_MODE` | `memory` (default) or `supabase` |
| `LLM_PROVIDER`, `STT_PROVIDER` | `openai` (the only provider implemented) |
| `OPENAI_API_KEY` | Needed for live mode |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Needed for supabase mode; the service-role key is server-only and bypasses database security |
| `ADMIN_KEY` | 16+ characters; unlocks `/admin` |
| `CRON_SECRET` | Lets you call `/api/cron/retention`; unset = 503 |
| `LLM_MODEL_JUDGE`, `LLM_MODEL_FAST` | Optional model overrides (defaults `gpt-6.1-sol`, `gpt-6-luna`) |
| `AI_GLOBAL_DAILY_LIMIT` | Optional site-wide cap on AI calls per 24 h (default 1500) |
| `SESSION_STARTS_PER_HOUR` | Optional cap on new sessions per network per hour (default 60). Locally every request counts as one network, so raise it if you create many sessions |
| `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY` | Unused placeholders |
| `VERCEL_OIDC_TOKEN` | Added automatically by `vercel link`; never set it by hand |

## 6. Run it

```bash
cd product/app
npm run dev                  # http://localhost:3000, reloads on save
```
- **Confirm the mode:** open http://localhost:3000/api/health. It should show `"aiMode":"mock","dataMode":"memory"` for setup A, `live` for B and C, and `supabase` for C.
- **Production-like run:** `npm run build && npm start`. This is stricter than dev and matches Vercel, so run it before any deploy.
- **Cookie note:** in a production build the session cookie (`ipc_session`) is `Secure`. Chrome accepts it on `http://localhost`; some other browsers don't, so use Chrome for `npm start`.
- **One at a time:** don't run `npm run dev` and a build or the E2E tests at the same time. They share the `.next/` folder.

## 7. Test it

```bash
cd product/app
npm run verify               # lint + typecheck + unit tests + E2E; must be green before any commit
```
Expected (as of 22 Nov 2026): 161 unit tests and 23 E2E tests, about 2 minutes.

| Command | What it runs | Tips |
|---|---|---|
| `npm run lint` | ESLint | |
| `npm run typecheck` | Route types + TypeScript | |
| `npm test` | Unit tests (Vitest) | One area: `npx vitest run src/modules/feedback` |
| `npm run e2e` | Browser tests (Playwright, Chromium) | Builds a production server on **port 3100**, always mock + memory, one at a time. One file: `npx playwright test e2e/smoke.spec.ts` |

- **No microphone needed:** recording tests use a fake microphone (`e2e/fixtures/fake-mic.ts`).
- **On failure:** a trace is saved in `test-results/`. Open it with `npx playwright show-trace <path>`.
- **Your keys aren't used:** the E2E tests never touch your `.env.local` keys, because the test config forces mock mode.

## 8. Manual testing tips

- **Quickest round:** home → **Try with a sample JD** → pick a question → agree to the recording notice → record a few seconds → answer or skip the follow-up → read the feedback → **Retry** → compare.
- **Mock mode ignores what you say:** the first recording always returns the same scripted answer (late decision, lots of "we"), and a retry returns an improved one. Use setup B to hear real feedback on real speech.
- **Live speech without a microphone (macOS):**
  ```bash
  say -o answer.m4a --data-format=aac "In my last internship I decided to ..."
  ```
  Upload it to `POST /api/attempts/<id>/answer` with `Content-Type: audio/mp4`. To get there, first call `POST /api/session/start` (keep the `ipc_session` cookie), then `POST /api/session/consent`.
- **Admin:** open `/admin` and enter the `ADMIN_KEY` from your `.env.local`.
- **Delete my data:** use `/privacy` or any interview page. Afterwards the private link stops working.
- **Retention job:** `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/retention`. Without the header you get 401; with no secret set, 503; otherwise 200 `{"deleted":N}`. Only recordings older than 30 days are deleted.
- **Limits you may hit while testing:**
  - 80 AI calls per session per day: you'll see a 429 "practice limit". Start a new session, or restart in memory mode.
  - 60 new sessions per hour per network: raise `SESSION_STARTS_PER_HOUR`.
  - Two clicks at once on the same answer: the second gets a 409 "still being processed". This is intended.

## 9. Nuances and gotchas

**Next.js 16 is newer than most models know:**
- Read `product/app/AGENTS.md` and `node_modules/next/dist/docs/` before using a Next API.
- `cookies()` and `params` are async, and middleware is now called `proxy`.
- With `cacheComponents` on, code that reads cookies, request data or the clock needs `await connection()`, or must sit inside `<Suspense>`. Otherwise the build fails with an error like "used `new Date()` during prerender".

**Architecture rules:**
- All data goes through the `Repo` interface. A new table or query must be added to **both** `lib/db/memory.ts` and `lib/db/supabase.ts`.
- Schema changes go in a **new numbered migration**; never edit an applied one. Apply it by hand to every Supabase project, and log it.
- All AI goes through `getLlm()` / `getStt()` and `withAiCall`; never call OpenAI directly. Each AI task has a contract in `lib/contracts.ts` and a prompt in `modules/ai/live/prompts.ts`; change both together.
- `env.ts` is the only file that reads environment variables. Add new ones to its schema and to `.env.example` (names only).
- Events must be on the allow-list in `modules/events/events.ts`. Never put user text in events or logs.

**Live AI:**
- **Time budget:** each request gets 45 s of AI time (routes allow 60 s).
- **Speech-to-text model:** `whisper-1` keeps word timestamps only until **26 Feb 2027**. Plan the switch before then.
- **Safari/iPhone recordings:** they arrive as `audio/mp4`, and OpenAI only accepts them when the file is named `.m4a`. This is already handled.
- **Test prompt changes in live mode:** the safety checks against invented facts only matter there, because the mock never invents anything.

**Memory mode** loses everything on restart and is refused on Vercel.

**Deployment** (only for people with Vercel access):
- Run `npx vercel deploy --prod` from `product/app`. The Vercel project isn't connected to GitHub, so pushing doesn't deploy.
- Production settings are changed in the Vercel dashboard, not in `.env.local`.
- `vercel link` creates a `.vercel/` folder and adds `VERCEL_OIDC_TOKEN` to `.env.local`; both are git-ignored.

**Claude Code hooks:** some setups run hooks (for example a "Fact-Forcing Gate") that block the first edit to a file until the agent says what it's changing and why. Answer briefly and retry; this comes from the user's own Claude configuration, not this repo.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `command not found: npx` / `node` | Node not on PATH (nvm) | §2 |
| `product/app` doesn't exist | The branch has no app code | §3.2: pick a branch that contains it |
| `npm ci` fails | Lockfile out of sync, or Node too old | Check `node -v` ≥ 20.9; try `npm install` |
| Server stops: "Invalid environment configuration (missing: …)" | The chosen mode needs a key that is empty | Fill in the named line (§5.3), or switch back to `mock`/`memory` |
| `/api/health` still shows `mock` after editing | Server not restarted, or the variable is set in your shell | Restart; `unset AI_MODE` |
| Live AI calls fail with 401 | Wrong or expired OpenAI key, or a space or quotes around it | Re-paste the key with nothing else on the line |
| Supabase "Invalid API key" | The anon/publishable key was pasted instead of the secret one | Use the **secret / service_role** key |
| Supabase "function … does not exist" | Migrations not applied to that project | Run 0001 → 0004 in order (§5.3) |
| E2E: port 3100 in use | An old server is still running | Stop it, or `E2E_PORT=3200 npm run e2e` |
| Build: "used `new Date()`/cookies during prerender" | Request-time code outside `connection()`/`<Suspense>` | §9 |
| Clicks do nothing in tests | Page not interactive yet | Wait for the button to be enabled; keep `useHydrated` |
| 429 on every AI step | Daily quota reached | New session, or restart memory mode |
| Transcription fails with HTTP 400 | Unsupported audio | Use webm, mp4/m4a, ogg, mpeg, wav or aac |

## 11. Before you finish a change

- [ ] `npm run verify` is green.
- [ ] Tests were added or updated (every bug gets a regression test).
- [ ] The module `README.md` is updated, and `product/06_product-engineering-context.md` too if a feature or pattern changed.
- [ ] A new entry is appended to `product/log.md` (plus the root `log.md` for root files), and `product/STATUS.md` is updated if the state changed.
- [ ] `git diff --cached` contains no `.env*` file (other than `.env.example`), no key, and no personal name.
- [ ] Commit and push only when the human asks.
