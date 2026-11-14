import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, requireSession } from "@/lib/http";
import { getStoryDeps, storyErrorResponse } from "@/modules/stories/deps";
import { mapStories } from "@/modules/stories/service";

/** POST /api/interviews/:id/map → { mappings } (SB4, G3): every competency gets a story or a gap. Owner only. */
export const maxDuration = 60;

export async function POST(_request: Request, ctx: RouteContext<"/api/interviews/[id]/map">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That interview was not found.");
  try {
    return json({ mappings: await mapStories(getStoryDeps(), session.id, id) });
  } catch (err) {
    return storyErrorResponse(err);
  }
}
