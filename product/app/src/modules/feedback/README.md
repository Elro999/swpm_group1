# modules/feedback

**Purpose:** turn a timed transcript plus the model's judgement into feedback that is **pinned to the user's own words and times** (PRD MF4, MF5; goals G2 "no quote, no claim", G5 "never rewrite").

## Who decides what
| Check | Owner | How |
|---|---|---|
| `late_decision`, `no_decision` | **code** | Decision sentence index comes from the model (validated in range); the *time* comes from word timestamps. Late = after the 2nd sentence or after 30 s (proposed threshold) |
| `we_not_i` | **code** | Count of I-forms vs we-forms (`metrics.ts`); pinned to the first "we" sentence |
| `too_long` | **code** | Duration over 2:15 (target ~2:00, proposed); pinned to the sentence at the 2-minute mark |
| `star_missing_situation` / `_task` / `_action` / `_result`, `star_order` (2026-11-27) | **code** | From the STAR part of each sentence (`attempts.answer_star`; the model only labels the user's own sentences, checked in code). A missing part is pinned to the sentence where it was expected (Situation: first; Task: before the first Action; Action: first Result; Result: last) and asks the STAR question. Order: going back to Situation/Task after Action/Result began; Action and Result may interleave; a decision headline in sentence 1 is allowed. Missing Action/Result = "Fix this", the rest "Worth a look" |
| `did_not_answer`, `competency_not_shown`, `vague_claim`, `strong_moment` | **model** | Accepted only if the quote is found verbatim in the transcript and the message is not a rewrite; max 4 |
Model-proposed delivery checks are **dropped** (the model may not own them). Every drop is counted.

## Files
| File | Role |
|---|---|
| `transcript.ts` | `buildCanonical` (words joined by spaces = the text every quote is checked against; sentences mapped to word indexes; very long unpunctuated runs chunked into 20-word pieces), `pinQuote` (quote → exact start/end ms), `pinSentence`, `formatMs` |
| `metrics.ts` | `countIWe`, `computeDelivery`, thresholds `TARGET_MS`, `TOO_LONG_MS`, `LATE_DECISION_MS` |
| `guards.ts` | `looksLikeRewrite` ("try saying…", or a quoted 4+ word passage the user never said), `verifyFollowup` (fallback question when the quote is invented) |
| `build.ts` | `buildFeedback(words, durationMs, fitOutput, {question, competency, star})` → metrics + pinned points + dropped count |
| `star.ts` | `answerStarParts` (sorted sentences → part per canonical sentence), `summariseStar` (present / missing / out of order), `starPoints` |

## Important for the live speech-to-text adapter (task 2.9)
Sentence splitting needs **punctuation on the words**. Whisper's word list has none (it is only in the full `text`), so the adapter must align punctuation from `text` onto the words. Without it, the chunking fallback still works but pins are coarser.

**Tests:** `star.test.ts` (STAR summary, order rule, pinning, no wording); `feedback.test.ts` (pinning, refusing invented quotes, I/we counting, decision timing, rewrite guard, follow-up fallback, dropping model-owned delivery checks, too-long, out-of-range decision index).

## Review fixes (2026-11-14)
- **No invented facts in model text:** fit messages and the follow-up question pass `inventsClaims` (guards.ts, built on `findInventions`): no number or name the user never said, and no ownership claim ("you led…") in a statement. Questions may ask about ownership; "your own" is fine. Failing points are dropped; a failing follow-up falls back to the fixed decision probe.
