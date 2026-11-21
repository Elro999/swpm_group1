import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { getLlm } from "@/modules/ai/factory";
import { discoveryErrorResponse } from "@/modules/discovery/deps";
import { draftStoryFromAnswer } from "@/modules/discovery/service";
import { toStoryView } from "@/modules/stories/deps";

/** POST /api/competencies/:id/draft-story { answer } → 201 { story, mapping } (SD2): fills the gap. Owner only. */
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/competencies/[id]/draft-story">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That skill was not found.");
  const body = await readJson(request, 64_000);
  if (isResponse(body)) return body;
  const answer = (body as { answer?: unknown })?.answer;
  if (typeof answer !== "string") return jsonError(400, "Write your answer first.");
  try {
    const { story, mapping } = await draftStoryFromAnswer({ repo: getRepo(), llm: getLlm() }, session.id, id, answer);
    return json({ story: toStoryView(story), mapping }, 201);
  } catch (err) {
    return discoveryErrorResponse(err);
  }
}
