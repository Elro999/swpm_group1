import { isUuid } from "@/lib/ids";
import { isResponse, jsonError, readJson, requireSession } from "@/lib/http";
import { attemptErrorResponse, getAttemptDeps, respondWithView } from "@/modules/attempt/deps";
import { startAttempt } from "@/modules/attempt/service";

/** POST /api/attempts { questionId } → 201 AttemptView. Requires consent and ownership (PF2, MF2). */
export async function POST(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const body = await readJson(request, 1_000);
  if (isResponse(body)) return body;
  const questionId = (body as { questionId?: unknown })?.questionId;
  if (!isUuid(questionId)) return jsonError(400, "Missing question.");
  try {
    return respondWithView(await startAttempt(getAttemptDeps(), session, questionId), 201);
  } catch (err) {
    return attemptErrorResponse(err);
  }
}
