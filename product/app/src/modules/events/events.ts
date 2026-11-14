import type { EventProps, Repo } from "@/lib/db/types";

/**
 * Product analytics events (PF3). Names and meanings: product/02_capability-and-architecture.md §7.
 * Three core events (Session 4/6): arrived = session_started, got the value = first_feedback_viewed,
 * came back = session_returned. Everything else supports funnels and quality checks.
 *
 * PRIVACY INVARIANT: props are small primitives only. Free text (anything with whitespace) and
 * long strings are rejected, so transcripts, stories, JDs and CVs can never leak into analytics.
 */
export const EVENT_NAMES = [
  // arrived
  "session_started",
  // got the value
  "first_feedback_viewed",
  "feedback_viewed",
  "story_marked_ready",
  "gap_story_filled",
  "prep_list_viewed",
  // came back
  "session_returned",
  // funnel and quality
  "interview_added",
  "questions_shown",
  "consent_given",
  "recording_started",
  "attempt_transcribed",
  "followup_shown",
  "retry_started",
  "retry_feedback_viewed",
  "compare_viewed",
  "point_marked_not_useful",
  "story_added",
  "bodylang_fakedoor_clicked",
  "data_deleted",
  "error_shown",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(name: unknown): name is EventName {
  return typeof name === "string" && (EVENT_NAMES as readonly string[]).includes(name);
}

/**
 * Events the BROWSER may report via POST /api/events (views and clicks the server cannot see).
 * Everything else is recorded server-side where the outcome happens, so it cannot be faked.
 * Add to this list only for genuinely client-only signals.
 */
export const CLIENT_EVENT_NAMES = [
  "questions_shown",
  "prep_list_viewed",
  "compare_viewed",
  "error_shown",
  "bodylang_fakedoor_clicked",
] as const satisfies readonly EventName[];
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];

export function isClientEventName(name: unknown): name is ClientEventName {
  return typeof name === "string" && (CLIENT_EVENT_NAMES as readonly string[]).includes(name);
}

export class EventPropsError extends Error {
  constructor(reason: string) {
    super(`Rejected event props: ${reason}`);
    this.name = "EventPropsError";
  }
}

const KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;
const MAX_KEYS = 10;
const MAX_STRING = 40; // fits a UUID (36); too short for meaningful free text

export function validateProps(props: unknown): EventProps {
  if (props === null || typeof props !== "object" || Array.isArray(props)) throw new EventPropsError("must be a plain object");
  const entries = Object.entries(props);
  if (entries.length > MAX_KEYS) throw new EventPropsError(`more than ${MAX_KEYS} keys`);
  for (const [k, v] of entries) {
    if (!KEY_RE.test(k)) throw new EventPropsError(`bad key "${k.slice(0, 32)}"`);
    if (v === null || typeof v === "boolean") continue;
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new EventPropsError(`non-finite number for "${k}"`);
      continue;
    }
    if (typeof v === "string") {
      // Never echo the value: it might be user text.
      if (v.length > MAX_STRING) throw new EventPropsError(`string too long for "${k}"`);
      if (/\s/.test(v)) throw new EventPropsError(`free text not allowed for "${k}"`);
      continue;
    }
    throw new EventPropsError(`unsupported value type for "${k}"`);
  }
  return props as EventProps;
}

export async function recordEvent(
  repo: Repo,
  sessionId: string | null,
  name: EventName,
  props: EventProps = {},
  at: Date = new Date(),
): Promise<void> {
  await repo.events.insert({ sessionId, name, props: validateProps(props), at });
}
