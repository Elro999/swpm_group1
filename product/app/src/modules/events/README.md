# modules/events

**Purpose:** product analytics for the MVP hypotheses (PRD PF3, PF5; doc 02 §7), without ever storing user text (constraint C5).

## Intended behaviour
- `recordEvent(repo, sessionId, name, props)` validates and stores one event.
- `EVENT_NAMES` is the closed list of allowed names. The three Session 4/6 events: **arrived** `session_started`, **got the value** `first_feedback_viewed`, **came back** `session_returned`. Others support funnels and quality.
- `validateProps` allows ≤ 10 keys named `snake_case`, with values that are numbers, booleans, null, or strings ≤ 40 chars **with no whitespace** (ids, enums). Anything that looks like free text is rejected, and the error never echoes the value.

## Client vs server events (Phase 1)
- The browser can report **only** `CLIENT_EVENT_NAMES` (currently `questions_shown`, `prep_list_viewed`, `compare_viewed`, `error_shown`, `bodylang_fakedoor_clicked`) through `POST /api/events`, via `trackEvent()` / `<TrackView>`.
- Every outcome event (`interview_added`, `consent_given`, `first_feedback_viewed`, …) is recorded **on the server** where the outcome happens, so it cannot be faked or double-counted.

Currently fired: `session_started`, `interview_added`, `consent_given`, `questions_shown` (client), `recording_started`, `retry_started`, `attempt_transcribed`, `followup_shown`, `feedback_viewed`, `first_feedback_viewed`, `retry_feedback_viewed`, `point_marked_not_useful`, `compare_viewed` (client). See `modules/attempt/README.md` for where each attempt event fires.

## Adding an event
Add the name to `EVENT_NAMES` (grouped by purpose), fire it from the module that owns the behaviour, add it to doc 02 §7, and if it feeds a hypothesis metric, to the metrics page (task 6.2).

**Tests:** `events.test.ts`.
