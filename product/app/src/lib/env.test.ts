import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

describe("parseEnv", () => {
  it("defaults to mock AI and in-memory data with no variables set", () => {
    const env = parseEnv({});
    expect(env.AI_MODE).toBe("mock");
    expect(env.DATA_MODE).toBe("memory");
    expect(env.LLM_PROVIDER).toBe("openai");
    expect(env.LLM_MODEL_JUDGE).toBeUndefined(); // provider defaults live in modules/ai/factory.ts
  });

  it("treats empty strings as missing", () => {
    expect(() => parseEnv({ DATA_MODE: "supabase", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow(EnvError);
  });

  it("requires Supabase URL and service key in supabase mode, naming them", () => {
    try {
      parseEnv({ DATA_MODE: "supabase" });
      throw new Error("expected EnvError");
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      expect((e as EnvError).missing).toEqual(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
    }
  });

  it("requires the LLM key and the chosen STT provider key in live mode", () => {
    try {
      parseEnv({ AI_MODE: "live", STT_PROVIDER: "deepgram" });
      throw new Error("expected EnvError");
    } catch (e) {
      expect((e as EnvError).missing).toEqual(["OPENAI_API_KEY", "DEEPGRAM_API_KEY"]);
    }
  });

  it("OpenAI-only live mode needs just one key", () => {
    try {
      parseEnv({ AI_MODE: "live" });
      throw new Error("expected EnvError");
    } catch (e) {
      expect((e as EnvError).missing).toEqual(["OPENAI_API_KEY"]);
    }
    expect(parseEnv({ AI_MODE: "live", OPENAI_API_KEY: "k" }).LLM_PROVIDER).toBe("openai");
  });

  it("never puts secret values in the error message", () => {
    try {
      parseEnv({ AI_MODE: "live", ANTHROPIC_API_KEY: "sk-very-secret-value" });
    } catch (e) {
      expect((e as Error).message).not.toContain("sk-very-secret-value");
    }
  });

  it("refuses the in-memory store on Vercel, where it would silently lose data", () => {
    expect(() => parseEnv({ VERCEL_ENV: "production" })).toThrow(/memory/);
  });

  it("rejects an admin key shorter than 16 characters", () => {
    expect(() => parseEnv({ ADMIN_KEY: "short" })).toThrow(EnvError);
  });

  it("accepts a complete live + supabase configuration", () => {
    const env = parseEnv({
      AI_MODE: "live",
      DATA_MODE: "supabase",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      OPENAI_API_KEY: "o",
    });
    expect(env.STT_PROVIDER).toBe("openai");
  });
});
