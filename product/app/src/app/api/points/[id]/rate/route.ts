import { NextResponse } from "next/server";
import { isUuid } from "@/lib/ids";
import { isResponse, jsonError, readJson, requireSession } from "@/lib/http";
import { attemptErrorResponse, getAttemptDeps } from "@/modules/attempt/deps";
import { ratePoint } from "@/modules/attempt/service";

/** POST /api/points/:id/rate { notUseful: boolean, reason?: string } → 204 (MF7). Owner only. */
export async function POST(request: Request, ctx: RouteContext<"/api/points/[id]/rate">) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That feedback point was not found.");
  const body = await readJson(request, 2_000);
  if (isResponse(body)) return body;
  const { notUseful, reason } = (body ?? {}) as { notUseful?: unknown; reason?: unknown };
  if (typeof notUseful !== "boolean") return jsonError(400, "Missing rating.");
  try {
    await ratePoint(getAttemptDeps(), session, id, { notUseful, reason: typeof reason === "string" ? reason : null });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return attemptErrorResponse(err);
  }
}
