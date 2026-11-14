# 01: Product requirements: Interview Prep Companion (MVP1)

**Status:** draft for team review · **Date:** 2026-11-13 · **Owner:** Suraj (with Claude)
**Source of truth for scope:** the team's Assignment 2 deck (slides 4, 6, 8, 10, 12, 14, 15, A2, A3) and `synthesis/01_personas-jtbd-and-prioritisation.md`. Where this file adds something the deck does not say, it is tagged **(proposed)**.
**Privacy:** participants are cited by deck counts ("N of 25") or by code. The deck uses first names; they are deliberately not copied here.

---

## 1. Problem statement
Placement candidates (Persona 1, **Abhinav**: MBA student, 3–5 yrs work, preparing fit and behavioural answers in the gaps between case prep) cannot see where an answer lost the listener. Peers are busy, interviewers give no feedback, and AI tools are generic or rewrite the story with a bigger role. Evidence: no feedback pinned to a moment (15 of 25), answer runs long with the point late (16 of 25), story not found / not fitted / "we" not "I" (12 of 25). Cost per deck slide 8: ~45 min rework after one mock, plus ~1 h preparing the example; one interview "tanked" by misreading the question. Not solving it means candidates keep rehearsing the same flawed answer and walk in with stories that sound generic or inflated.

## 2. Goals
Product goals (deck slide 15; all P0):

| ID | Goal | How we will measure it |
|---|---|---|
| G1 | First pinned feedback within **5 minutes of landing, with no sign-up** | event `first_feedback_viewed` minus `session_started` (per session) |
| G2 | **Every feedback point cites a timestamped line** from the user's own answer | server-side check: each point has a verbatim quote found in the transcript; 100% or the point is dropped |
| G3 | **Every JD competency shows a mapped story or a flagged gap** | check on the competency map: no competency without `story_id` or `gap=true` |
| G4 | Stories restructured **decision first**, team vs own actions split | structured fields present on every story marked ready |
| G5 | The AI **never adds** ownership, numbers or outcomes the user did not say | automated guard (§ capability doc, G-NO-INVENT) + teammate review of the first 5 users |
| G6 | **Every retry shows before vs after** on the same checks | retry view renders the same check set for both attempts |

MVP hypothesis metrics (deck slide 14, "Measured by"): ≥60% retry after feedback · ≥60% of stories marked ready · ≥1 gap filled per user · ≥40% return in week 2 unprompted.

## 3. Non-goals (deck slide 15, with reasons)
- **Case interviews, guesstimates, group discussions**: Kabir's case rounds come later; different feedback model.
- **Company-specific question banks**: Arjun's problem, later (8 of 25).
- **Calendar sync, full task manager**: prep list stays light (problem E is "in scope (light)").
- **Peer or alumni matching**: the product replaces the scarce partner, it does not broker one.
- **Scores, leaderboards, payments, native app**: no gamification or monetisation in MVP1; web only.
- **Technical rounds (DSA, finance technicals)**: already served by LeetCode and prep books.
- **Rewriting the user's answer or story** (product principle, not only an MVP cut): the AI asks and points, it does not rewrite.
- **Accounts / sign-up / email nudges** in MVP1 (deck: "no sign-up, no nudges"). Identity is an anonymous browser session plus a resume link.

## 4. Users
- **Primary (MVP1): Abhinav**, jobs J1 *Find and fit my stories* and J2 *Land the story*.
- **Later, same loop:** Kabir (J3 practise on demand), Arjun (J4 practise for this company). The data model keeps a `competency` and `interview` concept so these slot in without a rewrite.
- **Out of scope user:** technical-round grinders (anti-persona).

## 5. User stories
Grouped by deck module. IDs match the deck's feature IDs (MF, SB, SD, PL) so tests and tickets trace back to slide 14.

### Module 0: Setup (platform)
- US-0.1 As a candidate, I want to start without creating an account so that I get value in my first five minutes.
- US-0.2 As a candidate, I want to add an interview by pasting a JD (and optionally the date and my CV) so that everything after is tailored to that role.
- US-0.3 As a candidate, I want to come back to my work on the same device, or on another via a private link, so that my stories and attempts are not lost.
- US-0.4 As a candidate, I want to know what is recorded and delete everything in one click so that I trust it with my voice and stories.

### Module 1: Mock and feedback (MF1–MF7)
- US-1.1 (MF1) As Abhinav, I want 3–5 questions drawn from this JD's competencies so that I practise what this role tests.
- US-1.2 (MF2) As Abhinav, I want to answer by voice and get a timestamped transcript so that I can see my own words and timing.
- US-1.3 (MF3) As Abhinav, I want one hard follow-up that probes a vague claim in my answer so that the mock pushes back like a real interviewer.
- US-1.4 (MF4) As Abhinav, I want delivery feedback pinned to my lines (time to decision, I vs we, length) so that I know the exact moment to fix.
- US-1.5 (MF5) As Abhinav, I want fit feedback (did I answer the question, did I prove the competency) without a rewrite so that the answer stays mine.
- US-1.6 (MF6) As Abhinav, I want to retry the same question and see before vs after so that I know the fix worked.
- US-1.7 (MF7) As Abhinav, I want to mark any feedback point "not useful" so that bad feedback is flagged, not silently trusted.

### Module 2: Story builder (SB1–SB5)
- US-2.1 (SB1) As Abhinav, I want to paste stories or a doc into a story bank so that all my material is in one place.
- US-2.2 (SB2) As Abhinav, I want each story restated decision first (one-line situation, my decision, result, in my words) so that the listener hears my decision early.
- US-2.3 (SB3) As Abhinav, I want team vs my own actions split, with "we" and unsupported claims flagged, so that I can own what I did without overclaiming.
- US-2.4 (SB4) As Abhinav, I want 4–6 JD competencies, quoted from the JD, mapped to my stories with gaps shown so that I know which story to use for which ask.
- US-2.5 (SB5) As Abhinav, I want a guarantee that nothing is added to my story (ownership, numbers, outcomes) so that I sound like myself, not ChatGPT.

### Module 3: Story discovery (SD1–SD2)
- US-3.1 (SD1) As Abhinav, when a JD ask has no story, I want 3–5 prompts drawn from my CV and past roles so that I can find a story I could not see.
- US-3.2 (SD2) As Abhinav, I want my answer to a prompt turned into a draft story in my bank with nothing invented so that I can practise it straight away.

### Module 4: Prep list, light (PL1–PL2)
- US-4.1 (PL1) As Abhinav, given an interview date and JD, I want 3–5 stories and questions to rehearse in 20-minute blocks so that I know what to do in the gaps between case prep.
- US-4.2 (PL2) As Abhinav, I want the list to update as I mark stories ready so that it reflects my progress.

### Platform / operators
- US-5.1 As a teammate-reviewer, I want to read every feedback point for the first five users beside the transcript so that I can catch wrong or invented feedback before it misleads someone.
- US-5.2 As the team, we want a metrics page for the five MVP hypotheses so that we can decide to continue or pivot.

## 6. Requirements

### P0: must ship (MVP1 is not valid without these)
Acceptance criteria use Given / When / Then. Each requirement also needs a negative case (what must not happen).

**PF1 Anonymous session and resume link**
- Given a first-time visitor, when they open the site, then a private session is created without any form, and the first screen offers "Add an interview".
- Given the same browser returns, then their interviews, stories and attempts are present.
- Given the resume link, when opened on another device, then the same data loads. Not: another user's data is ever reachable by guessing a URL (tokens are random, ≥128 bit).

**PF2 Consent and deletion**
- Given the first mic use, then a plain-language notice states what is recorded, who processes it (LLM and transcription vendors), and how long it is kept; recording cannot start before "I agree".
- Given "Delete my data", when confirmed, then the session's rows and audio files are removed and the resume link stops working.

**PF3 Event tracking** (three events per Session 4/6: arrived · got the value · came back)
- Given the events list in the capability doc, then each fires once with a session id and timestamp, and none contains transcript or story text.

**MF1 Question set**
- Given a JD of at least ~150 characters, when the user continues, then 3–5 questions are shown, each tagged with the JD competency it tests and a quoted phrase from the JD.
- Given a too-short or non-JD input, then the user is told what is missing and no questions are invented.
- Not: technical, case or guesstimate questions.

**MF2 Voice answer and transcript**
- Given mic permission, when the user records and stops, then a transcript with per-word timestamps appears (target: within 20 s for a 2-min answer, to be verified).
- Given permission denied or no mic, then clear instructions are shown (typed fallback is P1).
- Recording length cap 3:00 per answer, with a visible timer.

**MF3 One follow-up**
- Given a transcribed answer, then exactly one follow-up question is produced that quotes the vague claim it probes. If no vague claim exists, then the follow-up probes the decision ("why that option over the alternative?"). Not: more than one follow-up.

**MF4 Delivery feedback pinned to lines**
- Given a transcript, then the screen shows: **time to decision** (seconds until the sentence stating his decision), **I vs we** counts, **length vs ~2-minute target**; each metric links to the timestamped line(s) behind it.

**MF5 Fit feedback, no rewrite**
- Given a transcript and the question's competency, then feedback states whether the question was answered and whether the competency was shown, citing verbatim lines.
- Not: any rewritten sentence of the user's answer, any suggested text to say. Only questions and pointers ("this line is where the decision should start").

**MF6 Retry and compare**
- Given a completed attempt, when the user retries the same question, then the second result shows the same checks side by side with the first (delta on time to decision, I/we, length, and per-point resolved / still present).

**MF7 Not-useful flag**
- Given any feedback point, when marked "not useful" (optional reason), then it is stored and appears in the review queue.

**SB1–SB5 Story bank**
- Given pasted text (one or many stories), then it is split into stories, each shown as decision-first card: situation (1 line), decision, result, each as the user's own words with the source span highlighted in the original.
- Given a story, then each sentence is labelled team vs own action; "we" statements and claims without evidence (no number/outcome) are flagged, never auto-fixed.
- Given a JD, then 4–6 competencies are extracted, each shown with the exact JD quote, mapped to the best story or marked a gap.
- Not: a number, outcome, scope or title appearing in a card that is not in the user's text (guard in capability doc).

**SD1–SD2 Gap discovery**
- Given a gap, then 3–5 prompts that reference the user's CV / roles are shown (if no CV was given, the user is asked to paste one first).
- Given the user's answer (text or voice), then a draft story is added to the bank, flagged "draft, from your answer", containing only what they said.

**PL1–PL2 Prep list**
- Given JD, stories and an interview date, then a list of 3–5 items in 20-minute blocks is shown (stories to rehearse, questions to practise); marking a story ready regenerates the list. No notifications.

**PF4 Teammate review page** (deck: "a teammate checks the feedback for the first 5 users")
- Given the admin key, then a read-only page lists sessions, transcripts, every feedback point with its quote, and the not-useful flags. Not reachable without the key.

**PF5 Metrics page**
- Given the admin key, then the page shows the five MVP metrics from §2 with numerator, denominator and the pass/fail target.

**PF6 Five-minute path**
- Given a user with no stories, then they can reach a first mock with only a JD (or one-click sample JD) and get pinned feedback; stories and CV are optional on this path.

### P1: should have (fast follow; the architecture must not block them)
- Strict vs supportive mode (deck P1 for MF).
- Typed-answer fallback when mic is unavailable (feedback pinned to sentence index).
- File upload for story doc (PDF/DOCX) instead of paste only.
- Daily nudges at a chosen time and missed-day reshuffle (needs identity: email or push; deliberately not MVP1).
- Body-language **fake door**: a "Get feedback on body language" button that only logs interest (deck P1).
- Full guided brainstorm from scratch; company-specific tailoring.

### P2: designed-for, not built
Kabir's case-round loop (same record → push back → feedback pipeline with a case prompt type); Arjun's company intel (question bank per company); accounts and cross-device history; peer sharing.

## 7. Success metrics

**Leading (days to weeks, from MVP1 sessions):**

| Metric | Target | Source |
|---|---|---|
| Time from landing to first pinned feedback | ≤ 5 min for ≥ 80% of sessions (proposed threshold) | G1 |
| Retry after feedback | ≥ 60% of users who got feedback | deck MF |
| Stories marked ready | ≥ 60% of stories created | deck SB |
| Gaps filled | ≥ 1 per user | deck SD |
| Feedback points marked "not useful" | ≤ 20% (proposed) | MF7 |
| Feedback points failing the quote check before display | tracked; target 0 shown | G2 |

**Lagging:** ≥ 40% return in week 2 unprompted (deck PL) · qualitative: "the listener names my decision" after retry (user interviews, 5–10 users) · invented-content incidents found by the teammate review: target 0.

**Evaluation plan:** review the first 5 sessions manually within 48 h of each; evaluate the numeric targets after ≥ 10 users or 2 weeks, whichever is later. Counts from ≤ 25 users are directional, not statistically conclusive (Session 6: analytics locates, interviews explain).

## 8. Open questions
| # | Question | Blocking? | Owner |
|---|---|---|---|
| Q1 | LLM and speech-to-text provider and API keys (user said "not sure yet"; plan defaults to Claude + Whisper behind swappable adapters, with a mock mode for development) | Blocks real AI behaviour, not the build | Suraj |
| Q2 | Consent wording and retention period (proposed: audio deleted after 30 days, text kept until user deletes). Also whether Indian data-protection rules need extra steps | Blocks public release | Team |
| Q3 | Who recruits the first 5 test users and who is the teammate reviewer for each | Blocks user testing | Team |
| Q4 | Speech accuracy on Indian-accented English with Whisper: acceptable, or switch provider? Test with 3 real recordings in Phase 2 | Non-blocking | Eng |
| Q5 | Domain / URL name for the public deploy (default: the free Vercel URL) | Non-blocking | Suraj |
| Q6 | Is typed-answer fallback needed for the first test cohort (mic issues on campus laptops)? | Non-blocking | Team |
| Q7 | Do we want the body-language fake door in MVP1 (cheap, tests demand) or skip it? | Non-blocking | Team |

## 9. Timeline and phasing
- The deck asks for an end-to-end working prototype within the team's ~8–10 h vibe-coding budget; the plan in `03_build-plan.md` sequences the **core loop first** (mock → pinned feedback → retry) so a usable product exists after Phase 2 and the rest layers on.
- Submission and demo dates are not in the deck (`[SUBMISSION DATE]` is blank): **ask the team** and record here.
- External dependencies: API keys (Q1), Vercel and Supabase accounts, and recruiting test users (Q3).
