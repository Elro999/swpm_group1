# modules/attempt

**Purpose:** one practice attempt at one question, the product's core loop (PRD MF2–MF7): record → transcribe → one follow-up → analyse → feedback → retry.

## State machine (`service.ts`)
```
created ──answer audio──▶ uploaded → transcribing → transcribed → followup_ready
followup_ready ──follow-up audio──▶ followup_uploaded → transcribing → followup_transcribed → analysing → ready
followup_ready ──skip──▶ analysing → ready
any step ──error──▶ failed   (stored data kept; resumeAttempt re-runs the first missing step)
```
`advance()` is **data-driven**: it checks what is stored (audio, words, follow-up, metrics) and does the next missing step. So "Try again" after a failure never needs the user to record again. Silence (no words) clears the audio and asks the user to record again.

## Rules enforced here
- **Consent (PF2):** `startAttempt`, `submitAnswerAudio` and `submitFollowupAudio` refuse with 403 when `session.consentAt` is null, as well as the UI hiding the recorder.
- **Ownership:** every function resolves attempt → question → `interviews.findForSession`; anything else is 404 (never 403, so ids cannot be probed).
- **Audio:** `audio/*` only (webm, mp4, ogg, mpeg, wav, m4a, aac), non-empty, ≤ 4 MB. Stored under `sessionId/attemptId/part` via `lib/audio.ts`.
- **One follow-up (MF3):** generated after the answer is transcribed, verified by `feedback/guards.verifyFollowup` (quote must be in the answer, else a fixed decision probe).
- **Feedback** is built by `modules/feedback` from the main answer; the follow-up answer is transcribed and shown, not scored.
- **Events (server-side):** `recording_started`, `retry_started` (attempt 2+), `attempt_transcribed`, `followup_shown`; `markFeedbackViewed` → `feedback_viewed` (once per attempt), `first_feedback_viewed` (once per session, with `ms_since_start` for goal G1), `retry_feedback_viewed`; `ratePoint` → `point_marked_not_useful`.
- **Logs** carry the failed stage and error name only, never user content.

## Files
| File | Role |
|---|---|
| `service.ts` | State machine, ownership/consent checks, view and rating events |
| `view.ts` | `AttemptView`: what the browser gets (own transcript and feedback; no audio keys) |
| `deps.ts` | Production wiring (`getAttemptDeps`), `respondWithView`, error → HTTP mapping |
| `compare.ts` | `compareAttempts(before, after)` (Phase 3, MF6/G6): pure before vs after on the **same five checks** (time to decision, I vs we share, length, answered, competency shown) with better/worse/same, and issues matched by **`checkId`** into fixed / still there / new; strengths (`strong_moment`) listed separately, never as issues. `CHECK_LABELS` for display |

## Before vs after (Phase 3)
`/i/[id]/mock/[qid]/compare` (`CompareLoader.tsx`): owner only; needs ≥ 2 finished attempts (otherwise a "practise twice" message). Defaults to the last two finished attempts; `?from=N&to=M` picks a pair (invalid values fall back to the previous attempt). With 3+ attempts a pair picker appears. The feedback screen links to it ("Compare with attempt N−1") from attempt 2 on. Fires the client event `compare_viewed {from, to}`.
Direction rules (proposed, tune with user feedback): decision found → better, lost → worse, ±1 s → same; I-share change under 5 points → same; length only judged when either side is over 2:15.

## HTTP (`src/app/api/attempts/…`, `src/app/api/points/…`)
`POST /api/attempts {questionId}` · `GET /api/attempts/:id` · `POST /api/attempts/:id/{answer|followup}` (raw audio body) · `POST …/skip-followup` · `POST …/resume` · `POST …/viewed` · `GET …/audio?part=answer|followup` · `POST /api/points/:id/rate {notUseful, reason?}`.
Each POST does at most one transcription + one model call, synchronously (no polling), within `maxDuration = 60`.

## UI
`src/app/i/[id]/mock/[qid]/`: `MockLoader` (server: ownership, consent redirect, latest attempt), `MockSession` (client flow), `FeedbackView` (metrics, pinned points with play-from-time, transcript highlights, "Not useful?"). Recorder: `src/components/Recorder.tsx`.

**Tests:** `attempt.test.ts` (happy path, follow-up recorded, consent/ownership/format refusals, retry numbering, view events once, ratings, transcription failure → resume, silence), `compare.test.ts` (directions, decision found/lost, length within target, fixed/still/new matching, summary), `e2e/phase2-mock-feedback.spec.ts`, `e2e/phase3-compare.spec.ts`.
