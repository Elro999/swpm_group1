import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isResponse, jsonError, requireSession } from "@/lib/http";
import { respondWithView } from "@/modules/attempt/deps";
import { loadOwnedAttempt } from "@/modules/attempt/service";

/** GET /api/attempts/:id → AttemptView (owner only). */
export async function GET(_request: Request, ctx: RouteContext<"/api/attempts/[id]">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  const owned = isUuid(id) ? await loadOwnedAttempt(getRepo(), id, session.id) : null;
  if (!owned) return jsonError(404, "That practice attempt was not found.");
  return respondWithView(owned.attempt);
}
