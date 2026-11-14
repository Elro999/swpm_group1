# modules/prep

**Purpose:** a light prep list for one interview (PRD PL1, PL2): what to rehearse next, in 20-minute blocks.

## Intended behaviour (`buildPrepList`, pure)
- **Derived, not stored.** Rebuilt from the current state on every hub render, so it updates the moment a story is marked ready or a question gets feedback (PL2), and can never drift. The `prep_items` table from migration 0001 is **unused** (documented deviation).
- **Tasks:** each matched story until it is marked ready ("Rehearse your story for X, then mark it ready"; a story serving several skills appears once; gaps are excluded because the hub's gap discovery handles them), and each question until it has feedback ("Practise out loud and get feedback").
- **Order:** open story and question tasks interleaved, story first. **3–5 blocks** of 20 minutes; if fewer than 3 are open, retries are added for questions practised exactly once.
- **When:** with an interview date, blocks are spread over the days left (Today, Tomorrow, then dates); a past date puts everything on Today; no date → "Next up".
- **Progress:** `done` / `total` across all tasks; when nothing is open the hub says the user is ready.
Thresholds and ordering are proposals to tune with users.

## Where it is used
`src/app/i/[id]/InterviewHub.tsx` (Prep list section; client event `prep_list_viewed {items, done}`). No notifications (deck: "no nudges" in MVP1).

**Tests:** `prep.test.ts` (interleaving and caps, PL2 updates, de-duplicated stories, retries top-up, day spreading, questions-only).
