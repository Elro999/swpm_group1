import "server-only";
import { NextResponse } from "next/server";
import { getAudioStore } from "@/lib/audio";
import { getRepo } from "@/lib/db";
import type { AttemptRow } from "@/lib/db/types";
import { json, jsonError } from "@/lib/http";
import { getLlm, getStt, requestDeadline } from "@/modules/ai/factory";
import { AiQuotaError } from "@/modules/ai/log";
import { AttemptError, type AttemptDeps } from "./service";
import { buildAttemptView } from "./view";

/** Respond with the client view of an attempt. */
export async function respondWithView(attempt: AttemptRow, status = 200): Promise<NextResponse> {
  const repo = getRepo();
  const question = await repo.questions.findById(attempt.questionId);
  if (!question) return jsonError(404, "That question was not found.");
  return json(await buildAttemptView(repo, attempt, question), status);
}

/** Production wiring for the attempt pipeline (tests build their own deps). */
export function getAttemptDeps(): AttemptDeps {
  const deadline = requestDeadline(); // one budget shared by transcription and the model call in this request
  return { repo: getRepo(), llm: getLlm(deadline), stt: getStt(deadline), audio: getAudioStore() };
}

/** Map pipeline errors to HTTP; anything unexpected becomes a generic 500 with no details leaked. */
export function attemptErrorResponse(err: unknown): NextResponse {
  if (err instanceof AttemptError || err instanceof AiQuotaError) return jsonError(err.status, err.message);
  console.error("attempt route failed", { name: (err as Error)?.name });
  return jsonError(500, "Something went wrong. Please try again.");
}
