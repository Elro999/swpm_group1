import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { getStoryDeps, storyErrorResponse, toStoryView } from "@/modules/stories/deps";
import { addStories } from "@/modules/stories/service";

/** POST /api/stories { text } → 201 { stories } (SB1–SB3). One paste may hold several stories. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const body = await readJson(request, 64_000);
  if (isResponse(body)) return body;
  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string") return jsonError(400, "Paste your stories first.");
  try {
    const stories = await addStories(getStoryDeps(), session.id, text);
    return json({ stories: stories.map(toStoryView) }, 201);
  } catch (err) {
    return storyErrorResponse(err);
  }
}
