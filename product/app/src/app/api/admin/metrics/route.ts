import { getRepo } from "@/lib/db";
import { json, jsonError } from "@/lib/http";
import { buildAdminOverview } from "@/modules/admin/review";
import { isAdminRequest } from "@/modules/admin/server";

/** GET /api/admin/metrics → { metrics, sessionCount } for the team (PF5). 401 unless the admin cookie is valid. */
export async function GET() {
  if (!(await isAdminRequest())) return jsonError(401, "Admin access required.");
  const { metrics, sessions } = await buildAdminOverview(getRepo());
  return json({ metrics, sessionCount: sessions.length });
}
