import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { getStoryDeps, storyErrorResponse, toStoryView } from "@/modules/stories/deps";
import { updateStory } from "@/modules/stories/service";

/** PATCH /api/stories/:id { ready?: boolean, rawText?: string } → story (4.5). Owner only. */
export const maxDuration = 60;

export async function PATCH(request: Request, ctx: RouteContext<"/api/stories/[id]">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That story was not found.");
  const body = await readJson(request, 64_000);
  if (isResponse(body)) return body;
  const { ready, rawText } = (body ?? {}) as { ready?: unknown; rawText?: unknown };
  if (ready !== undefined && typeof ready !== "boolean") return jsonError(400, "Invalid request.");
  if (rawText !== undefined && typeof rawText !== "string") return jsonError(400, "Invalid request.");
  try {
    const story = await updateStory(getStoryDeps(), session.id, id, { ready: ready as boolean | undefined, rawText: rawText as string | undefined });
    return json({ story: toStoryView(story) });
  } catch (err) {
    return storyErrorResponse(err);
  }
}
