import "server-only";
import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { AiQuotaError } from "@/modules/ai/log";
import { StoryError } from "@/modules/stories/service";
import { DiscoveryError } from "./service";

/** Map discovery (and story) errors to HTTP; anything else is a generic 500 with no user text logged. */
export function discoveryErrorResponse(err: unknown): NextResponse {
  if (err instanceof DiscoveryError || err instanceof StoryError || err instanceof AiQuotaError) return jsonError(err.status, err.message);
  console.error("discovery route failed", { name: (err as Error)?.name });
  return jsonError(500, "Something went wrong. Please try again.");
}
