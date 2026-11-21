import { createHash, timingSafeEqual } from "node:crypto";
import { getAudioStore } from "@/lib/audio";
import { getRepo } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { json, jsonError } from "@/lib/http";
import { purgeExpiredAudio } from "@/modules/retention/retention";

/**
 * GET /api/cron/retention: daily audio retention (vercel.json "crons"). Vercel Cron calls it with
 * "Authorization: Bearer $CRON_SECRET"; anything else gets 401. Without CRON_SECRET the route is off (503).
 * A failure returns 500 so it shows as failed in the Vercel cron log and is retried the next day.
 */
export const maxDuration = 60;

const sha = (s: string) => createHash("sha256").update(s).digest();

export async function GET(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return jsonError(503, "Retention is not configured.");
  const given = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(sha(given), sha(`Bearer ${secret}`))) return jsonError(401, "Unauthorized.");
  try {
    return json(await purgeExpiredAudio(getRepo(), getAudioStore()));
  } catch (err) {
    console.error("audio retention failed", { name: (err as Error)?.name, message: (err as Error)?.message }); // no user content
    return jsonError(500, "Retention run failed.");
  }
}
