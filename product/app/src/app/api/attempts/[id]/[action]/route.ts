import { NextResponse } from "next/server";
import { MAX_AUDIO_BYTES, getAudioStore } from "@/lib/audio";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isResponse, jsonError, readAudio, requireSession } from "@/lib/http";
import { attemptErrorResponse, getAttemptDeps, respondWithView } from "@/modules/attempt/deps";
import {
  loadOwnedAttempt,
  markFeedbackViewed,
  resumeAttempt,
  skipFollowup,
  submitAnswerAudio,
  submitFollowupAudio,
} from "@/modules/attempt/service";

/**
 * Attempt actions, one route with an explicit allow-list (doc 02 §5):
 *   POST answer          body: raw audio (Content-Type audio/*) → transcribe → follow-up    → AttemptView
 *   POST followup        body: raw audio                         → transcribe → analyse     → AttemptView
 *   POST skip-followup                                           → analyse                  → AttemptView
 *   POST resume          re-run the failed step from stored data                            → AttemptView
 *   POST viewed          record feedback_viewed / first_feedback_viewed (server-side)       → 204
 *   GET  audio?part=answer|followup                              → the owner's own recording
 * Each POST does at most one transcription + one model call, so it fits the serverless limit (A5).
 */
export const maxDuration = 60;

type Ctx = RouteContext<"/api/attempts/[id]/[action]">;

export async function POST(request: Request, ctx: Ctx) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id, action } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "That practice attempt was not found.");
  const deps = getAttemptDeps();

  try {
    switch (action) {
      case "answer":
      case "followup": {
        const audio = await readAudio(request, MAX_AUDIO_BYTES);
        if (isResponse(audio)) return audio;
        const fn = action === "answer" ? submitAnswerAudio : submitFollowupAudio;
        return respondWithView(await fn(deps, session, id, audio.bytes, audio.mime));
      }
      case "skip-followup":
        return respondWithView(await skipFollowup(deps, session, id));
      case "resume":
        return respondWithView(await resumeAttempt(deps, session, id));
      case "viewed":
        await markFeedbackViewed(deps, session, id);
        return new NextResponse(null, { status: 204 });
      default:
        return jsonError(404, "Unknown action.");
    }
  } catch (err) {
    return attemptErrorResponse(err);
  }
}

export async function GET(request: Request, ctx: Ctx) {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const { id, action } = await ctx.params;
  if (action !== "audio" || !isUuid(id)) return jsonError(404, "Not found.");
  const owned = await loadOwnedAttempt(getRepo(), id, session.id);
  const part = new URL(request.url).searchParams.get("part") === "followup" ? "followup" : "answer";
  const key = part === "followup" ? owned?.attempt.followupAudioKey : owned?.attempt.answerAudioKey;
  const file = key ? await getAudioStore().get(key) : null;
  if (!file) return jsonError(404, "Recording not found.");
  return new NextResponse(Buffer.from(file.bytes), {
    headers: { "Content-Type": file.mime, "Cache-Control": "private, no-store", "Content-Length": String(file.bytes.byteLength) },
  });
}
