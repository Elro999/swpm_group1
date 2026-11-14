import "server-only";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import { ADMIN_COOKIE, cookieGrantsAdmin } from "./auth";

/** Server glue: is the current request from an admin? (cookie set by POST /api/admin/login) */
export async function isAdminRequest(): Promise<boolean> {
  const key = getEnv().ADMIN_KEY;
  return cookieGrantsAdmin((await cookies()).get(ADMIN_COOKIE)?.value, key);
}

export const adminEnabled = (): boolean => Boolean(getEnv().ADMIN_KEY);

export function adminCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: 60 * 60 * 12 };
}
