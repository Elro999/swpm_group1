import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { isUuid } from "@/lib/ids";
import { getStoryDeps, storyErrorResponse, toStoryView } from "@/modules/stories/deps";
import { addStory, assertOwnedCompetency, linkBuiltStory } from "@/modules/stories/service";

/**
 * POST /api/stories { title, text, forCompetencyId? } → 201 { story, link } (SB1–SB3). One story per request,
 * sorted into STAR. With forCompetencyId ("Build story" from a question card), the story is then checked
 * against that one competency: link = { competencyId, rationaleQuote } when it fits, else null.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const body = await readJson(request, 64_000);
  if (isResponse(body)) return body;
  const { text, title, forCompetencyId } = (body ?? {}) as { text?: unknown; title?: unknown; forCompetencyId?: unknown };
  if (typeof text !== "string") return jsonError(400, "Write your story first.");
  if (title !== undefined && title !== null && typeof title !== "string") return jsonError(400, "Invalid request.");
  if (forCompetencyId !== undefined && (typeof forCompetencyId !== "string" || !isUuid(forCompetencyId))) return jsonError(400, "Invalid request.");
  try {
    const deps = getStoryDeps();
    if (forCompetencyId) await assertOwnedCompetency(deps, session.id, forCompetencyId as string); // before saving anything
    const story = await addStory(deps, session.id, { text, title: title as string | null | undefined });
    const link = forCompetencyId ? await linkBuiltStory(deps, session.id, story.id, forCompetencyId as string) : null;
    return json({ story: toStoryView(story), link }, 201);
  } catch (err) {
    return storyErrorResponse(err);
  }
}
