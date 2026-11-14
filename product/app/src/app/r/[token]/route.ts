import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { attachSessionCookie } from "@/modules/session/cookie";
import { findSessionByToken } from "@/modules/session/session";

/**
 * GET /r/<token> (PF1 resume link). Valid token → set the session cookie and go home.
 * Unknown, malformed or deleted → 404 with a plain explanation. Never reveals whether a session existed.
 */
export async function GET(request: Request, ctx: RouteContext<"/r/[token]">) {
  const { token } = await ctx.params;
  const session = await findSessionByToken(getRepo(), token);
  if (!session) {
    return new NextResponse("This resume link is not valid, or its data was deleted.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.headers.set("Cache-Control", "no-store");
  return attachSessionCookie(res, token);
}
