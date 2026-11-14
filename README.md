# SWPM Group 1: interview-prep product

Shared workspace for our Software Product Management project (ISB). Everything the team and our AI agents need lives here.

## The product: Interview Prep Companion

**Live demo: https://interview-prep-companion.vercel.app**

A web app that helps students practise fit and behavioural interview answers out loud and see exactly where to improve. Every piece of feedback points to the user's own words, and the app never writes answers for them.

**Features**
- **Questions from the job description:** paste a JD and get the key competencies plus practice questions, each tied to a quote from the JD.
- **Voice practice:** answer out loud, get one follow-up question about what you said, then feedback pinned to the exact moment in your answer: how late your decision comes, "we" vs "I", length, and whether you showed the competency.
- **Retry and compare:** record again and see what changed.
- **Story bank:** paste your stories; the app picks out the situation, your decision and the result using only your words, and maps them to the job's competencies.
- **Gap prompts:** for a competency with no story yet, it asks questions based on your CV to help you find one.
- **Prep list:** what to practise next before your interview date.
- **Private by default:** no account or email. Recordings are deleted after 30 days, and you can delete everything at any time.

**How to use it**
1. Open the live site and click **Start with my job description** (or **Try with a sample JD**). No sign-up; copy your private link if you want to come back later.
2. Paste the job description, and optionally your CV and interview date.
3. Pick a question, agree to the recording notice, and answer out loud.
4. Answer or skip the follow-up, read your feedback, then retry to improve.
5. Add your stories to see which competencies are covered and which are gaps.

Built with Next.js, OpenAI (language model and Whisper speech-to-text) and Supabase, hosted on Vercel. To run it locally or contribute, see [`product/STATUS.md`](product/STATUS.md) and [`product/app/`](product/app/).

## Repo map

- **`research/`**: 25 masked user interviews and each teammate's personas from Assignment 1. Start with `research/participants.md`.
- **`course_material/`**: class notes for Sessions 1–7: the frameworks and PM practitioner insights we apply to the research.
- **`synthesis/`**: team-level analysis built from the research: merged personas, JTBD, which persona to build for.
- **`product/`**: the MVP build: PRD, architecture, build plan, live `STATUS.md`, and the web app code (`product/app/`). Start with `product/STATUS.md`.
- **`instructions.md`**: rules for agents (and humans): folder map, order of trust, privacy, logging.
- **`log.md`**: change log. Every folder has its own `log.md`; entries are append-only.

Using an agent (Claude Code, Codex, Cursor…)? Point it at this repo; `CLAUDE.md` / `AGENTS.md` tell it to read `instructions.md` first.
