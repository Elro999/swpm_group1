# Instructions for agents (read this first)

This repo belongs to **Group 1, Software Product Management (ISB, PGP Co'27, Term 5)**. We are building a product for **interview preparation**: how candidates (mostly ISB PGP students in placement season, plus some working professionals) prepare for job interviews, where it breaks down, and what would help. Each teammate interviewed 5 potential users (25 interviews in total) and built personas from them in Assignment 1. The next assignments (JTBD, problems, value proposition, MVP, prototype) build on this research.

## Folder map
| Path | What's there | Use it for |
|---|---|---|
| `research/` | All user research, masked | Start here for anything about users |
| `research/participants.md` | Index of all 25 participants: code, profile, persona, links | Find who said what and which files to open |
| `research/transcripts/` | 25 interview transcripts, one per participant | **Primary evidence**: quotes, behaviours, frequency of problems |
| `research/personas/` | 5 files, one per teammate: personas + problem hypotheses + coded quotes | Each teammate's *interpretation* of their 5 interviews |
| `course_material/` | Class notes, Sessions 1–7 (one file per session) | **The method**: frameworks, templates and PM practitioner rules to apply to the research (JTBD, problem statements, sizing, value proposition, MVP, metrics). Its `instructions.md` maps each session to the deliverable it feeds |

**Research is the evidence; course material is the method.** Before producing any deliverable, read the relevant session(s) in `course_material/` and follow their templates and rules, then ground every claim in `research/`.

More folders (synthesis, MVP, prototype, …) will be added when needed. Each folder has its own `instructions.md` and `log.md`. **Read the `instructions.md` of any folder before working in it.**

## Order of trust
1. **Transcripts are the source of truth.** If a persona file and a transcript disagree, the transcript wins.
2. Persona files are one teammate's synthesis. Personas from different teammates overlap and use different names; compare them before merging.
3. Anything you create later must cite its evidence with participant codes (e.g. "ROH-4, SRI-5"), so others can trace it back.

## Logging (mandatory for every agent and person)
Every time you add, change, move or delete anything in this folder, append an entry to **the `log.md` of the folder you changed**:
- Add your entry at the **bottom**. **Never edit or delete existing entries**, even to fix a typo; write a new entry instead.
- Use the format shown at the top of `log.md`: date, who (person + agent), **What**, **Why**, **Files**.
- If your change spans several folders, log it in each folder you touched **and** in the root `log.md`.
- Creating a new folder? Give it its own `instructions.md` (what's here, what to look for, what it's for) and `log.md` (same format) in the same change.

## Privacy rules (the repo may be shared)
- Never add real names of interviewees or third parties, PG IDs, emails, phone numbers, employer or university names tied to a participant, or links to recordings.
- Refer to participants only by their code (`ROH-3`, `ADD-5`, …).
- Do not add the original PDFs or audio. If you find anything identifying, mask it and log the fix.

## Working conventions
- Markdown only for written content, so every agent can read it.
- Don't rewrite or "clean up" the research files; they are records. Put new analysis in a new folder.
- Keep file names lowercase-with-hyphens, prefixed with participant/team codes where relevant.
