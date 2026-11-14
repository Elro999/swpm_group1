import { z } from "zod";

/**
 * Environment configuration. One place reads process.env; everything else calls getEnv().
 *
 * Modes (see product/02_capability-and-architecture.md, A2/A3):
 * - AI_MODE=mock   → deterministic mock LLM + STT, no keys needed (default).
 * - AI_MODE=live   → real providers; needs ANTHROPIC_API_KEY + the STT provider's key.
 * - DATA_MODE=memory   → in-process store, lost on restart (default; dev, tests, demos).
 * - DATA_MODE=supabase → Postgres + Storage; needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Error messages name missing variables but never print values.
 */

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const schema = z.object({
  AI_MODE: z.preprocess(emptyToUndefined, z.enum(["mock", "live"]).default("mock")),
  DATA_MODE: z.preprocess(emptyToUndefined, z.enum(["memory", "supabase"]).default("memory")),
  STT_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["openai", "deepgram"]).default("openai")),
  LLM_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["openai", "anthropic"]).default("openai")),
  SUPABASE_URL: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  DEEPGRAM_API_KEY: optionalString,
  // Optional overrides; each provider has its own defaults (modules/ai/factory.ts).
  LLM_MODEL_JUDGE: optionalString,
  LLM_MODEL_FAST: optionalString,
  ADMIN_KEY: optionalString,
  VERCEL_ENV: optionalString,
  // Cost and abuse controls (review fix 2026-11-14); defaults live in the modules that use them.
  AI_GLOBAL_DAILY_LIMIT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  SESSION_STARTS_PER_HOUR: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  // Vercel Cron sends "Authorization: Bearer $CRON_SECRET" to /api/cron/retention. Unset → the route refuses.
  CRON_SECRET: optionalString,
});

export type AppEnv = z.infer<typeof schema>;

export class EnvError extends Error {
  constructor(
    public readonly missing: string[],
    public readonly problems: string[] = [],
  ) {
    const parts = [];
    if (missing.length) parts.push(`missing: ${missing.join(", ")}`);
    if (problems.length) parts.push(...problems);
    super(`Invalid environment configuration (${parts.join("; ")}). See product/app/.env.example.`);
    this.name = "EnvError";
  }
}

export function parseEnv(raw: Record<string, string | undefined>): AppEnv {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Report which variables are malformed, never their values.
    const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    throw new EnvError([], names.map((n) => `${n} has an invalid value`));
  }
  const env = parsed.data;
  const missing: string[] = [];
  const problems: string[] = [];

  if (env.DATA_MODE === "supabase") {
    if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (env.AI_MODE === "live") {
    const needs = new Set<string>();
    needs.add(env.LLM_PROVIDER === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY");
    needs.add(env.STT_PROVIDER === "deepgram" ? "DEEPGRAM_API_KEY" : "OPENAI_API_KEY");
    for (const k of needs) if (!env[k as "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "DEEPGRAM_API_KEY"]) missing.push(k);
  }
  if (env.ADMIN_KEY !== undefined && env.ADMIN_KEY.length < 16) {
    problems.push("ADMIN_KEY must be at least 16 characters");
  }
  if (env.VERCEL_ENV && env.DATA_MODE === "memory") {
    problems.push("DATA_MODE=memory is not allowed on Vercel (data would be lost between requests); use supabase");
  }

  if (missing.length || problems.length) throw new EnvError(missing, problems);
  return env;
}

let cached: AppEnv | undefined;

/** Parsed, validated environment. Cached per process; call resetEnvForTests() in tests that change it. */
export function getEnv(): AppEnv {
  cached ??= parseEnv(process.env);
  return cached;
}

export function resetEnvForTests(): void {
  cached = undefined;
}
