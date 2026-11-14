# 04: Demo script (about 6 minutes)

For the final demo or a dry run. Runs with **no keys or accounts** (mock AI, in-memory data), so it is safe to rehearse. In mock mode the "transcript" is a fixed synthetic answer, whatever you say; say so in the demo, and switch to live mode once task 2.9 is done.

## Before you start
```bash
cd product/app
npm install
ADMIN_KEY=demo-team-key-1234567 npm run dev
```
Open http://localhost:3000 in a fresh browser window (or a private window, so no earlier session shows up).

## The story to tell (deck slides 4–14)
Abhinav, an MBA placement candidate, has a shortlist and wants to land a two-minute fit answer that is his, not ChatGPT's.

| Step | Do | Say (what it proves) |
|---|---|---|
| 1 | Landing → **Try with a sample JD** → **Create my questions** | No sign-up (G1). Every question quotes the JD it came from: "no quote, no claim". |
| 2 | **Find stories for this role** → every skill is a **Gap** | J1: he can't see which of his experiences fit. |
| 3 | On a gap: **Find a story for this** → paste a few CV lines → pick a prompt → type an answer → **Turn into a draft story** | SD1/SD2: prompts point at *his* CV; the draft is built only from his words; the gap is filled. |
| 4 | **My stories** → open the card → **Who did what** | SB2/SB3: decision first, "we" vs "I" flagged as questions, never rewritten (SB5). |
| 5 | Back on the hub: **I agree, let me practise** → **Practise question 1** → record a few seconds → **Use this answer** | Consent before recording (PF2). One follow-up that quotes his answer (MF3). |
| 6 | **Skip the follow-up** → feedback | MF4/MF5: time to decision, I vs we, length, measured from timestamps; every point quotes his words with ▶ play-from-moment. |
| 7 | Mark one point **Not useful?** with a reason | MF7: bad feedback is flagged for the team. |
| 8 | **Try this question again** → record → skip → **Compare with attempt 1** | MF6/G6: same checks side by side; "Decision arrives late" moves to **Fixed**. |
| 9 | Hub **Prep list** | PL1/PL2: 20-minute blocks; it updates as stories become ready. |
| 10 | http://localhost:3000/admin → key `demo-team-key-1234567` | PF4/PF5: the team's review queue (quotes checkable against the transcript, the "not useful" reason) and the five hypothesis metrics with targets. |
| 11 | **Privacy** → **Delete my data** → confirm | PF2: recordings and data gone; the private link stops working. |

## Questions you may get
- *Is the feedback real?* In this build the AI is mocked; the pipeline, guards and screens are real. Live mode (Claude + speech-to-text) is task 2.9 and needs API keys.
- *How do you stop the AI inventing things?* Story fields and feedback quotes must be found word for word in the user's own text, or they are dropped; delivery metrics are computed in code from timestamps, not by the model; a guard rejects added numbers, names and role-inflating verbs.
- *What will you measure?* The five MVP hypotheses on the admin page (doc 02 §7), read alongside user interviews.
