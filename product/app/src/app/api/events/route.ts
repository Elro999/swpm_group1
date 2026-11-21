import { getRepo } from "@/lib/db";
import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { EventPropsError, isClientEventName, recordEvent } from "@/modules/events/events";

/**
 * POST /api/events (PF3). Lets the browser report view-type events that the server cannot see
 * (e.g. questions_shown). Only CLIENT_EVENT_NAMES are accepted; outcome events such as
 * first_feedback_viewed are recorded by the server so they cannot be faked or double-counted.
 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const body = await readJson(request, 4_000);
  if (isResponse(body)) return body;

  const { name, props } = (body ?? {}) as { name?: unknown; props?: unknown };
  if (!isClientEventName(name)) return jsonError(400, "Unknown event.");
  try {
    await recordEvent(getRepo(), session.id, name, (props ?? {}) as never);
  } catch (err) {
    if (err instanceof EventPropsError) return jsonError(400, "Event properties were not allowed.");
    throw err;
  }
  return json({ ok: true }, 202);
}
