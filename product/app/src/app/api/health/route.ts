import { connection, NextResponse } from "next/server";
import { EnvError, getEnv } from "@/lib/env";

/**
 * GET /api/health. Reports which modes are active so a human or a test can see the setup at a glance.
 * Never returns secret values; on a bad configuration it names the missing variables only.
 */
export async function GET() {
  // Without this, Next 16 prerenders the route at build time and reports build-time env, not runtime env.
  await connection();
  try {
    const env = getEnv();
    return NextResponse.json(
      { ok: true, aiMode: env.AI_MODE, dataMode: env.DATA_MODE, sttProvider: env.STT_PROVIDER, adminEnabled: Boolean(env.ADMIN_KEY) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof EnvError ? e.message : "Configuration error";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
