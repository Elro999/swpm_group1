# modules/admin

**Purpose:** team-only tools (PRD PF4, PF5): a review queue so a teammate can check the first users' feedback, and the MVP hypothesis metrics.

## Access (`auth.ts`, `server.ts`)
- One shared `ADMIN_KEY` (env, ≥ 16 chars). Unset → admin is **off** (pages say so; `/api/admin/login` is 404).
- `POST /api/admin/login {key}` compares timing-safely and sets `ipc_admin` = **HMAC(ADMIN_KEY)** (httpOnly, `sameSite=strict`, 12 h). The key itself is never stored in the cookie. `POST /api/admin/logout` clears it.
- Every admin page and route calls `isAdminRequest()` first; admin pages call `await connection()` so the key check runs per request (a build-time prerender would freeze it). Pages are `noindex`.
- No login rate limit yet (the key is long and random); add one in task 7.3.

## Metrics (`metrics.ts`, pure)
| Key | Definition | Target |
|---|---|---|
| `first_feedback_5min` | sessions whose `first_feedback_viewed.ms_since_start` ≤ 5 min ÷ sessions with first feedback (+ median) | ≥ 80% (proposed) |
| `retry_after_feedback` | sessions with `retry_started` ÷ sessions with `feedback_viewed` | ≥ 60% |
| `stories_ready` | stories in state `ready` ÷ all stories | ≥ 60% |
| `gaps_filled` | `gap_story_filled` events ÷ sessions with `interview_added` | ≥ 1 per user |
| `week2_return` | sessions ≥ 7 days old with a `session_returned` on day 7–14 ÷ sessions ≥ 7 days old | ≥ 40% |
| `not_useful_rate` (counter-metric) | feedback points marked not useful ÷ all feedback points | ≤ 20% (proposed) |
A denominator of 0 shows **"no data yet"**, never a fake 0%. With ≤ 25 users the numbers are directional only.

## Review data (`review.ts`)
`buildAdminOverview` (session list with counts + metrics, max 500 sessions) and `buildSessionReview` (one session: interviews, each attempt's transcript, follow-up, every feedback point with quote, time and "not useful" reason, and stories). Reviewers check that every quote is in the transcript and that no message adds wording, roles, numbers or results. The consent notice and privacy page disclose that a team member may read transcripts.

## Pages
`/admin` (`AdminOverview`) and `/admin/s/[sid]` (`SessionReviewView`); components `AdminLogin`, `AdminLogout` in `components/AdminControls.tsx`.

**Tests:** `admin.test.ts` (auth, every metric with seeded events, "no data", review data with quotes and reasons), `e2e/phase6-admin-delete.spec.ts`.
