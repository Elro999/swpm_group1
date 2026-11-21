import { getRepo } from "@/lib/db";
import { isResponse, json, requireSession } from "@/lib/http";
import { recordEvent } from "@/modules/events/events";

/**
 * POST /api/session/consent (PF2). Records that the user agreed to the recording notice on /privacy.
 * Recording UI stays locked until consent_at is set. Idempotent: agreeing twice keeps the first time.
 */
export async function POST() {
  const session = await requireSession();
  if (isResponse(session)) return session;
  if (!session.consentAt) {
    const repo = getRepo();
    await repo.sessions.setConsent(session.id, new Date());
    await recordEvent(repo, session.id, "consent_given");
  }
  return json({ consented: true });
}
