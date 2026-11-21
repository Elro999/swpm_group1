# modules/streak

**Purpose:** a personal prep streak that rewards consistency without nagging (PRD Module 5, ST1–ST3; S5 "Products that stick").

## Intended behaviour
- `computeStreak({ events, now, timeZone, interviewDates })` is **pure** and **derived**: it reads the session's events and returns a `StreakSummary`. Nothing is stored, so there is no table, no migration and nothing to keep in sync (same approach as `modules/prep`).
- **A day counts** when the user does any action in `PREP_ACTIONS` that day: `interview_added`, `story_added`, `story_marked_ready`, `gap_story_filled`, `recording_started`, `retry_started`, `feedback_viewed`, `point_marked_not_useful`, `compare_viewed`. Automatic page views (`questions_shown`, `prep_list_viewed`), session events and system steps do not count.
- **Rest day:** `REST_DAYS_PER_WEEK` (1) missed day per Monday–Sunday week is forgiven automatically.
- **Revive:** any further missed day breaks the run. If the gap is at most `MAX_REVIVE_DAYS` (3) unforgiven days, the user can bring the run back: come back (any action starts the comeback) and do one **practice rep** per lost day by the end of the next day (`REVIVE_EXTRA_DAYS` = 1). Practice reps (`PRACTICE_REPS`) are `feedback_viewed` (once per attempt), `story_marked_ready` and `gap_story_filled`, so a revive costs real prep. If the window closes, the old run is dropped and the comeback run continues.
- **The number** is the count of days with prep in the current run. Rest and revived days bridge the run but do not add to it.
- **Days** are calendar days in the user's timezone (the browser sends it; `safeTimeZone` falls back to `Asia/Kolkata`). Practice at 00:30 counts for the day it happened. Today never counts as a miss while it is in progress.
- `status`: `none` · `active_today` · `pending_today` · `revivable` (broken, can still be revived) · `reviving` (came back, reps due) · `broken` (gap too long).

## Where it shows
| Place | File | What |
|---|---|---|
| API | `app/api/streak/route.ts` | `GET /api/streak?tz=` → `StreakSummary` for the current session (401 without one) |
| Header | `components/streak/StreakChip.tsx` | Flame + number; filled when today counts, outlined while open, "Revive" when revivable; hidden for `none`/`broken` |
| Hub | `components/streak/StreakCard.tsx` | Headline, interview countdown, rest-day chip, Mon–Sun strip, calm message or revive offer, today's rep (first prep-list item), this week's prep days and reps |
| Feedback | `components/streak/StreakToast.tsx` | After the view is recorded: "Day N. Streak kept." or how many reps a revive still needs |

The views share `useStreak()` (reloads on navigation and on `refreshStreak()`).

## Deliberately not built
No notifications or emails (no accounts; PRD non-goal "no nudges"), no XP, points or leaderboards, no stored streak. Possible later: an opt-in "add my prep blocks to my calendar" export as the external trigger, and a `streak` metric on `/admin`.

## Privacy
Reads only event names and times; events never hold user text (`modules/events`). Deleting the session deletes the events, so the streak goes with them.

**Tests:** `streak.test.ts` (rules, rest days, revive success/expiry, timezone, week strip, countdown), `e2e/streak.spec.ts` (starts on adding an interview, confirmation after feedback, no chip for a new visitor).
