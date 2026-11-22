import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { getStoryDeps, storyErrorResponse, toStoryView } from "@/modules/stories/deps";
import { addStory } from "@/modules/stories/service";

/** POST /api/stories { title, text } → 201 { story } (SB1–SB3). One story per request, sorted into STAR. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const body = await readJson(request, 64_000);
  if (isResponse(body)) return body;
  const { text, title } = (body ?? {}) as { text?: unknown; title?: unknown };
  if (typeof text !== "string") return jsonError(400, "Write your story first.");
  if (title !== undefined && title !== null && typeof title !== "string") return jsonError(400, "Invalid request.");
  try {
    const story = await addStory(getStoryDeps(), session.id, { text, title: title as string | null | undefined });
    return json({ story: toStoryView(story) }, 201);
  } catch (err) {
    return storyErrorResponse(err);
  }
}
