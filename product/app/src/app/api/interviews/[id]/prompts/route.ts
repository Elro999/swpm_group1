import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, requireSession } from "@/lib/http";
import { getLlm } from "@/modules/ai/factory";
import { discoveryErrorResponse } from "@/modules/discovery/deps";
import { ensureCardPrompts } from "@/modules/discovery/service";

/** POST /api/interviews/:id/prompts → { made } (SD1, design/01): make and save each card's CV prompts once. Owner only. */
export const maxDuration = 60;

export async function POST(_request: Request, ctx: RouteContext<"/api/interviews/[id]/prompts">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That interview was not found.");
  try {
    return json({ made: await ensureCardPrompts({ repo: getRepo(), llm: getLlm() }, session.id, id) });
  } catch (err) {
    return discoveryErrorResponse(err);
  }
}
