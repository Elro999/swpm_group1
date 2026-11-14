# product/: instructions for agents

## What's here
The plan and (from Phase 0 onward) the code for **MVP1 of the Interview Prep Companion**, a web product for placement candidates (primary persona: Abhinav). It turns the team's Assignment 2 deck (problems, JTBD, value proposition, MVP) into a working product. **Method:** `course_material/` S3 (value proposition, hypothesis) and S4 (MVP, goals / non-goals, instrumentation). **Evidence:** `research/` and `synthesis/`.

| Path | What it is | Read it when |
|---|---|---|
| `STATUS.md` | **Live state**: current phase, what works, what is next, blockers, how to run. Updated every task | **Always first** after this file |
| `01_prd.md` | What we build and why: goals, non-goals, user stories, requirements with acceptance criteria, metrics, open questions | Before changing scope or behaviour |
| `02_capability-and-architecture.md` | How: constraints, feasibility, stack, data model, state machines, API index, AI guardrails, events, security, tests | Before touching code structure, data, AI or privacy |
| `03_build-plan.md` | Ordered phases and tasks with "done when", setup steps for the user, effort and cut order, agent protocol | To pick the next task |
| `04_demo-script.md` | Six-minute demo walk-through mapped to the deck's requirement IDs, runnable with no keys | Before a demo or user test |
| `app/` | The Next.js application (created in Phase 0). Each module under `app/src/modules/<name>/` has its own `README.md`: intended behaviour, inputs/outputs, invariants, tests | When working on that module |
| `log.md` | Append-only history of every change | To see what happened and why |

## Product rules that must never be broken (full list in doc 02, "Constraints")
1. The AI **never rewrites** a user's answer or story and **never adds** ownership, numbers or outcomes they did not say.
2. Every feedback point **quotes the user's own words** and points to a timestamp. No quote, no point.
3. Fit and behavioural interviews only. No sign-up in MVP1. Consent before recording; one-click deletion.
4. Mock mode (`AI_MODE=mock`) must keep working with no API keys.

## Rules for working here
- Follow the **agent working protocol** at the bottom of `03_build-plan.md`.
- Code is the one exception to the repo's "Markdown only" convention. Everything *written about* the code (specs, READMEs, status, logs) stays Markdown.
- **Privacy:** no real names, PG IDs, emails, employers, recordings or API keys in code, fixtures, prompts, logs or commits. Test data is synthetic. Participants are cited by code or deck counts. `.env*` files are git-ignored; only `.env.example` (names, no values) is committed.
- Docs 01 and 02 describe intent; if the code and a doc disagree, **fix one of them and log which and why**. Do not leave them drifting.
- If you change scope, a contract, a guard or a data table: update docs 01/02, `STATUS.md`, the module README, and log it.

## Logging (mandatory)
Append an entry at the bottom of `product/log.md` for every change (date, who, **What**, **Why**, **Files**). Never edit past entries. If you also touched another folder, log in that folder's `log.md` and the root `log.md`.
