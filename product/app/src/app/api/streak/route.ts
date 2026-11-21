import { getRepo } from "@/lib/db";
import { isResponse, json, requireSession } from "@/lib/http";
import { computeStreak, safeTimeZone } from "@/modules/streak/streak";

/**
 * GET /api/streak?tz=<IANA timezone> → 200 StreakSummary (prep streak; modules/streak).
 * Derived from this session's events on every call; nothing is stored. Interview dates become milestones
 * (the road to each interview, and the result once it has passed). The browser sends its own timezone so
 * days match the user's calendar; a bad or missing value falls back to India time.
 */
export async function GET(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const repo = getRepo();
  const tz = safeTimeZone(new URL(request.url).searchParams.get("tz"));
  const [events, interviews] = await Promise.all([repo.events.list({ sessionId: session.id }), repo.interviews.listBySession(session.id)]);
  return json(computeStreak({ events, now: new Date(), timeZone: tz, interviews: interviews.map((i) => ({ id: i.id, date: i.interviewDate, addedAt: i.createdAt })) }));
}
