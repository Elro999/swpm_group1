import { getRepo } from "@/lib/db";
import { isResponse, json, jsonError, readJson, requireSession } from "@/lib/http";
import { getLlm } from "@/modules/ai/factory";
import { AiQuotaError } from "@/modules/ai/log";
import { createInterview, InterviewGenerationError } from "@/modules/interview/service";
import { validateInterviewInput } from "@/modules/interview/validation";

/**
 * POST /api/interviews (US-0.2, MF1). Body: { jd, cv?, interviewDate? }.
 * 201 { id } · 400 { errors: { jd?, cv?, interviewDate? } } · 401 no session · 422 generation failed.
 */
export const maxDuration = 60; // two model calls with one retry each; see doc 02 A5

export async function POST(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const body = await readJson(request);
  if (isResponse(body)) return body;

  const input = validateInterviewInput(body);
  if (!input.ok) return jsonError(400, "Please fix the highlighted fields.", { errors: input.errors });

  try {
    const { interview } = await createInterview({ repo: getRepo(), llm: getLlm() }, session.id, input.data);
    return json({ id: interview.id }, 201);
  } catch (err) {
    if (err instanceof InterviewGenerationError) return jsonError(422, err.message);
    if (err instanceof AiQuotaError) return jsonError(err.status, err.message);
    console.error("POST /api/interviews failed", { name: (err as Error)?.name }); // no user text in logs
    return jsonError(500, "Something went wrong while preparing your questions. Please try again.");
  }
}
