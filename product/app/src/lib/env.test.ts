import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

describe("parseEnv", () => {
  it("defaults to mock AI and in-memory data with no variables set", () => {
    const env = parseEnv({});
    expect(env.AI_MODE).toBe("mock");
    expect(env.DATA_MODE).toBe("memory");
    expect(env.LLM_MODEL_JUDGE).toBe("claude-sonnet-5-5");
    expect(env.LLM_MODEL_FAST).toBe("claude-haiku-5-5");
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
      expect((e as EnvError).missing).toEqual(["ANTHROPIC_API_KEY", "DEEPGRAM_API_KEY"]);
    }
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
      ANTHROPIC_API_KEY: "a",
      OPENAI_API_KEY: "o",
    });
    expect(env.STT_PROVIDER).toBe("openai");
  });
});
