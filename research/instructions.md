# research/: instructions for agents

## What's here
- `participants.md`: index of all 25 interviews (code, who interviewed them, generalised profile, persona assigned, links). **Open this first.**
- `transcripts/`: 25 interview transcripts, one file per participant. The holy grail: raw evidence.
- `personas/`: 5 files, one per teammate, with personas, problem hypotheses (JTBD / pains / gains) and coded quotes.

Participant codes: `ROH` = Rohith, `SAM` = Samyak, `SUR` = Suraj, `SRI` = Sri, `ADD` = Addyant, followed by interview number 1–5.

## What to look for, and why
| You are working on… | Look at… |
|---|---|
| Personas (merging into one team set) | All 5 `personas/` files; check overlaps against `participants.md`; confirm each trait in the transcripts |
| JTBD | Section 1.2 of each personas file + `[J]` tags in transcripts |
| Problems and their size/frequency | `[P]` tags in transcripts; count how many of the 25 participants raise each problem and how often it happens to them |
| Current solutions / competitors | "Tools currently used" in personas + mentions of ChatGPT, Claude, casebooks, peers, alumni, LinkedIn etc. in transcripts |
| Value proposition | `[G]` gains and `[P]` pains, plus "trigger to switch" / "what would make them leave" in personas files |
| MVP scope | The most frequent, most painful problems with the weakest current workarounds |

## Caveats
- Teammates used different formats and tag styles; each transcript's header explains its format.
- ROH transcripts have no speaker labels; infer speakers from context.
- Sample is small (25) and mostly ISB students; say so when you generalise.

## Rules for this folder
- **Read-only research.** Don't edit the substance of transcripts or personas. Fixes allowed: masking something identifying, fixing broken links or formatting. Log them.
- New interviews: add the transcript to `transcripts/` with the next code, update `participants.md`, and log both.
- Analysis and synthesis belong in a new top-level folder, not here.

## Logging (mandatory for every agent and person)
Every time you add, change, move or delete anything in this folder, append an entry to **this folder's `log.md`**:
- Add your entry at the **bottom**. **Never edit or delete existing entries**, even to fix a typo; write a new entry instead.
- Use the format shown at the top of `log.md`: date, who (person + agent), **What**, **Why**, **Files**.
- If your change spans several folders, log it in each folder you touched **and** in the root `log.md`.
- Creating a new folder? Give it its own `instructions.md` (what's here, what to look for, what it's for) and `log.md` (same format) in the same change.

## Privacy rules (the repo may be shared)
- Never add real names of interviewees or third parties, PG IDs, emails, phone numbers, employer or university names tied to a participant, or links to recordings.
- Refer to participants only by their code (`ROH-3`, `ADD-5`, …).
- Do not add the original PDFs or audio. If you find anything identifying, mask it and log the fix.
