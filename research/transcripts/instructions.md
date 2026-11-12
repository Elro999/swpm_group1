# research/transcripts/: instructions for agents

## What's here
25 interview transcripts, one per participant, named `<CODE>_<short-profile>.md` (e.g. `ROH-4_engineer-abroad-switch-to-design.md`). Each file starts with a header table: participant code, interviewer, generalised profile, the persona it fed, a link to the personas file, and **how to read that transcript** (speaker labels, timestamps, tags).

**These are the source of truth for the project.** Every claim about users should trace back to a line here.

## What to look for, and why
- **Tags**: `[P]` pain, `[J]` job to be done, `[G]` gain, `[Q]` quote worth reusing. Suraj's transcripts use turn IDs (`I2-13`) and letters after responses instead.
- **Frequency and severity** of problems: how often it happens (every interview? every case?) and what it costs (hours lost, rejections, anxiety). Needed to size problems.
- **Workarounds and tools** (ChatGPT/Claude, casebooks, peers, seniors, alumni, notes, recordings): show current solutions and what's missing.
- **Exact quotes** for decks: quote verbatim and cite the code, e.g. "…" (ADD-2).

## Caveats
- Formats differ by teammate (see each header). ROH transcripts have no speaker labels.
- Transcription is automated; mis-heard words and odd phrasing are expected. Don't "correct" quotes when citing; mark uncertainty instead.
- Placeholders like `[a global bank]` are deliberate masking, not transcription gaps.

## Rules for this folder
- Don't edit transcript content. Allowed: masking identifying details and fixing formatting, both logged.
- New interview: add `<CODE>_<short-profile>.md` with the same header table, update `../participants.md`, and log in both folders.

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
