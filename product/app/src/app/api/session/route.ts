import { NextResponse } from "next/server";
import { getAudioStore } from "@/lib/audio";
import { getRepo } from "@/lib/db";
import { isResponse, jsonError, requireSession } from "@/lib/http";
import { clearSessionCookie } from "@/modules/session/cookie";
import { deleteSession } from "@/modules/session/session";

/**
 * DELETE /api/session (PF2, task 6.3): "Delete my data". Removes the user's recordings, then every row they own,
 * and clears the cookie; their private resume link stops working. 500 (nothing deleted) if audio removal fails.
 */
export async function DELETE() {
  const session = await requireSession();
  if (isResponse(session)) return session;
  try {
    const { audioFiles } = await deleteSession(getRepo(), session.id, getAudioStore());
    return clearSessionCookie(NextResponse.json({ deleted: true, audioFiles }, { headers: { "Cache-Control": "no-store" } }));
  } catch (err) {
    console.error("DELETE /api/session failed", { name: (err as Error)?.name });
    return jsonError(500, "We couldn't delete everything just now. Nothing was removed; please try again.");
  }
}
