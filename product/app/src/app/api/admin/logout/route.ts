import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/modules/admin/auth";
import { adminCookieOptions } from "@/modules/admin/server";

/** POST /api/admin/logout → 204, admin cookie cleared. */
export async function POST() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return res;
}
