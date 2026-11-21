import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { discoveryErrorResponse } from "@/modules/discovery/deps";
import { saveCv } from "@/modules/discovery/service";

/** POST /api/interviews/:id/cv { cv } → { ok } — add or replace the CV used for gap prompts (SD1). Owner only. */
export async function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/cv">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That interview was not found.");
  const body = await readJson(request, 64_000);
  if (isResponse(body)) return body;
  const cv = (body as { cv?: unknown })?.cv;
  if (typeof cv !== "string") return jsonError(400, "Paste your CV first.");
  try {
    await saveCv({ repo: getRepo() }, session.id, id, cv);
    return json({ ok: true });
  } catch (err) {
    return discoveryErrorResponse(err);
  }
}
