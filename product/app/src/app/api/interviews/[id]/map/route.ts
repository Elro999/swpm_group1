import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { getStoryDeps, storyErrorResponse } from "@/modules/stories/deps";
import { matchStories } from "@/modules/stories/service";

/**
 * POST /api/interviews/:id/map { storyIds?: string[] } → { linked, checked } (SB4, G3, design/01).
 * Checks only cards without a story; never replaces a match or a story the user picked. Owner only.
 */
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/map">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That interview was not found.");
  const body = await readJson(request, 8_000);
  if (isResponse(body)) return body;
  const storyIds = (body as { storyIds?: unknown } | null)?.storyIds;
  if (storyIds !== undefined && !(Array.isArray(storyIds) && storyIds.length <= 100 && storyIds.every((s) => typeof s === "string" && isUuid(s)))) {
    return jsonError(400, "Invalid request.");
  }
  try {
    const r = await matchStories(getStoryDeps(), session.id, id, { storyIds: storyIds as string[] | undefined });
    return json({ linked: r.linked.length, checked: r.checked });
  } catch (err) {
    return storyErrorResponse(err);
  }
}
