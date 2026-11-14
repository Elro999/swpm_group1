# modules/session

**Purpose:** anonymous identity without sign-up (PRD PF1, constraint C4).

## Intended behaviour
- A visitor gets a session by `POST /api/session/start`: no form. Calling it again with a valid cookie reuses the session (`created: false`).
- The session token is 32 random bytes (base64url, 43 chars). It lives only in an httpOnly cookie (`ipc_session`, 90 days, `sameSite=lax`, `secure` in production) and in the private resume link `/r/<token>`.
- The database stores **only `sha256(token)`**. A leaked DB row cannot be turned into a working link.
- `/r/<token>` on any device sets the cookie and redirects home; unknown, malformed or deleted tokens get a 404 that does not say whether a session existed.
- `deleteSession` removes the session and (by cascade) everything it owns. Audio deletion joins it when audio exists (Phase 2 / task 6.3).

## Files
| File | Role |
|---|---|
| `token.ts` | `newToken`, `hashToken`, `isWellFormedToken` (format check before any DB lookup) |
| `session.ts` | `startSession`, `findSessionByToken`, `deleteSession`; pure functions over a `Repo` |
| `cookie.ts` | Server-only glue: cookie options, `attachSessionCookie`, `readSessionToken`, `getCurrentSession` |

## Invariants (tested)
Token format and uniqueness; only the hash is stored; malformed tokens never reach the repo; deleted sessions do not resolve; `session_started` carries no props.

## Consent (PF2, Phase 1)
`POST /api/session/consent` sets `consent_at` once and records `consent_given`. The UI side is `components/ConsentGate.tsx`: recording controls are not rendered until consent exists. Phase 2's recording APIs must also refuse when `session.consentAt` is null.

## Return visits and deletion (Phase 6)
- `noteVisit` runs inside `getCurrentSession` (after `await connection()`): a 12 h+ gap records `session_returned {days_since_start}`; `last_seen_at` is written at most every 5 minutes. Failures never block the page.
- `deleteSession(repo, id, audio)` removes the recordings first, then every row (cascade), then records an anonymous `data_deleted {audio_files}` (no session id). If audio removal fails, nothing is deleted and the error surfaces so the user can retry. `DELETE /api/session` also clears the cookie. UI: `components/DeleteDataButton.tsx` (two-step confirm) on `/privacy` and each interview hub.

**Tests:** `token.test.ts`, `session.test.ts`, `e2e/smoke.spec.ts`, `e2e/phase1-interview-setup.spec.ts` (consent, resume link).
