import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, requireSession } from "@/lib/http";
import { getLlm } from "@/modules/ai/factory";
import { discoveryErrorResponse } from "@/modules/discovery/deps";
import { gapPrompts } from "@/modules/discovery/service";

/** POST /api/competencies/:id/prompts → { prompts } (SD1): 3–5 prompts pointing at the user's CV. 409 if no CV. */
export const maxDuration = 60;

export async function POST(_request: Request, ctx: RouteContext<"/api/competencies/[id]/prompts">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That skill was not found.");
  try {
    return json({ prompts: await gapPrompts({ repo: getRepo(), llm: getLlm() }, session.id, id) });
  } catch (err) {
    return discoveryErrorResponse(err);
  }
}
