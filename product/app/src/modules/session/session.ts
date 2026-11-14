import { createHash } from "node:crypto";
import type { AudioStore } from "@/lib/audio";
import type { Repo, SessionRow } from "@/lib/db/types";
import { recordEvent } from "@/modules/events/events";
import { hashToken, isWellFormedToken, newToken } from "./token";

/**
 * Anonymous sessions (PF1). Pure functions over a Repo so they are unit-testable;
 * the cookie glue for route handlers lives in ./cookie.ts.
 */

/** Gap after which a visit counts as "came back" (doc 02 §7; the third Session 4/6 event). */
export const RETURN_GAP_MS = 12 * 60 * 60 * 1000;
/** last_seen_at is written at most this often, so ordinary page loads do not each cost a write. */
export const TOUCH_THROTTLE_MS = 5 * 60 * 1000;
const DAY_MS = 86_400_000;

/**
 * Called on every request that identifies the visitor (6.4). After a 12 h+ gap it records
 * session_returned {days_since_start}; it then updates last_seen_at (throttled).
 */
export async function noteVisit(repo: Repo, session: SessionRow, now: Date = new Date()): Promise<SessionRow> {
  const gap = now.getTime() - session.lastSeenAt.getTime();
  if (gap < TOUCH_THROTTLE_MS) return session;
  if (gap >= RETURN_GAP_MS) {
    await recordEvent(repo, session.id, "session_returned", { days_since_start: Math.floor((now.getTime() - session.createdAt.getTime()) / DAY_MS) }, now);
  }
  await repo.sessions.touch(session.id, now);
  return { ...session, lastSeenAt: now };
}

/**
 * Rate-limit key for starting sessions: a salted hash of the client IP (never the raw IP). On Vercel the
 * first x-forwarded-for entry is set by the platform; locally there is none, so all local starts share a key.
 */
export function sessionStartKey(headers: Headers): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
  return `session_start:${createHash("sha256").update(`ipc-session-start-v1:${ip}`).digest("base64url")}`;
}

export async function startSession(repo: Repo): Promise<{ session: SessionRow; token: string }> {
  const token = newToken();
  const session = await repo.sessions.create(hashToken(token));
  await recordEvent(repo, session.id, "session_started");
  return { session, token };
}

export async function findSessionByToken(repo: Repo, token: string | undefined | null): Promise<SessionRow | null> {
  if (!isWellFormedToken(token)) return null;
  return repo.sessions.findByTokenHash(hashToken(token));
}

/**
 * "Delete my data" (PF2, task 6.3). Removes the recordings first, then every row (cascade from sessions),
 * then records an anonymous data_deleted event (no session id, so nothing links back to the user).
 * If audio removal fails, nothing else is deleted and the error propagates, so the user can try again
 * instead of being left with orphaned recordings.
 */
export async function deleteSession(repo: Repo, sessionId: string, audio?: AudioStore): Promise<{ audioFiles: number }> {
  const keys = new Set<string>();
  for (const iv of await repo.interviews.listBySession(sessionId)) {
    for (const q of await repo.questions.listByInterview(iv.id)) {
      for (const a of await repo.attempts.listByQuestion(q.id)) {
        if (a.answerAudioKey) keys.add(a.answerAudioKey);
        if (a.followupAudioKey) keys.add(a.followupAudioKey);
      }
    }
  }
  if (audio) {
    // Also sweep the session's whole storage folder, so a recording whose key was lost from the rows
    // (e.g. an upload whose database write failed) is still deleted (review fix).
    // A session cannot exceed this many recordings (80 AI calls a day), so one listing is enough.
    for (const k of await audio.list({ prefix: `${sessionId}/`, limit: 5000 })) keys.add(k);
    if (keys.size) await audio.remove([...keys]);
    // Verify against storage before deleting rows: if anything is left, stop so the user can retry.
    if ((await audio.list({ prefix: `${sessionId}/`, limit: 1 })).length) throw new Error("Audio delete did not complete");
  }
  await repo.sessions.delete(sessionId);
  await recordEvent(repo, null, "data_deleted", { audio_files: keys.size });
  return { audioFiles: keys.size };
}
