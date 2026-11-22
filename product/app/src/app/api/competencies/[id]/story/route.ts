import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { getStoryDeps, storyErrorResponse } from "@/modules/stories/deps";
import { setCompetencyStory } from "@/modules/stories/service";

/** PUT /api/competencies/:id/story { storyId: string | null } → { mapping } (Change / Unlink on a question card). Owner only. */
export async function PUT(request: Request, ctx: RouteContext<"/api/competencies/[id]/story">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That skill was not found.");
  const body = await readJson(request, 2_000);
  if (isResponse(body)) return body;
  const storyId = (body as { storyId?: unknown })?.storyId;
  if (storyId !== null && (typeof storyId !== "string" || !isUuid(storyId))) return jsonError(400, "Invalid request.");
  try {
    const row = await setCompetencyStory(getStoryDeps(), session.id, id, storyId);
    return json({ mapping: { competencyId: row.competencyId, storyId: row.storyId, chosenByUser: row.chosenByUser ?? false } });
  } catch (err) {
    return storyErrorResponse(err);
  }
}
