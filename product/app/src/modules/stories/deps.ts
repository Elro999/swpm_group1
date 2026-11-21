import "server-only";
import type { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import type { StoryRow } from "@/lib/db/types";
import { jsonError } from "@/lib/http";
import { getLlm } from "@/modules/ai/factory";
import { AiQuotaError } from "@/modules/ai/log";
import { StoryError } from "./service";

export const getStoryDeps = () => ({ repo: getRepo(), llm: getLlm() });

/** What the browser receives for a story (the user's own text and structure; no session id). */
export type StoryView = Omit<StoryRow, "sessionId" | "createdAt" | "updatedAt">;
export const toStoryView = ({ sessionId: _s, createdAt: _c, updatedAt: _u, ...rest }: StoryRow): StoryView => {
  void _s;
  void _c;
  void _u;
  return rest;
};

export function storyErrorResponse(err: unknown): NextResponse {
  if (err instanceof StoryError || err instanceof AiQuotaError) return jsonError(err.status, err.message);
  console.error("story route failed", { name: (err as Error)?.name }); // no user text in logs
  return jsonError(500, "Something went wrong with your stories. Please try again.");
}
