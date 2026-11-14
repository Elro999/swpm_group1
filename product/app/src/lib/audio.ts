import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Audio storage (MF2). Same two-mode pattern as lib/db: memory for dev/tests, Supabase Storage
 * (private bucket "audio", created by migration 0001) for real users. Audio is personal data:
 * keys are namespaced by session, and nothing here ever logs bytes.
 *
 * Keys: `${sessionId}/${attemptId}/${part}` where part is "answer" or "followup".
 */
export interface AudioStore {
  put(key: string, bytes: Uint8Array, mime: string): Promise<void>;
  get(key: string): Promise<{ bytes: Uint8Array; mime: string } | null>;
  remove(keys: string[]): Promise<void>;
}

export const MAX_AUDIO_BYTES = 4_000_000; // ~3 min of Opus at 32 kbps is ~0.7 MB; AAC on Safari stays well under this
export const ALLOWED_AUDIO_MIME = /^audio\/(webm|mp4|ogg|mpeg|wav|x-m4a|aac)(;.*)?$/i;

export const audioKey = (sessionId: string, attemptId: string, part: "answer" | "followup") => `${sessionId}/${attemptId}/${part}`;

export function createMemoryAudioStore(): AudioStore {
  const files = new Map<string, { bytes: Uint8Array; mime: string }>();
  return {
    async put(key, bytes, mime) {
      files.set(key, { bytes: new Uint8Array(bytes), mime });
    },
    async get(key) {
      const f = files.get(key);
      return f ? { bytes: new Uint8Array(f.bytes), mime: f.mime } : null;
    },
    async remove(keys) {
      for (const k of keys) files.delete(k);
    },
  };
}

/** Status: written against the Supabase Storage API but NOT yet run against a real project (setup S1). */
export function createSupabaseAudioStore(url: string, serviceRoleKey: string): AudioStore {
  const bucket = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from("audio");
  return {
    async put(key, bytes, mime) {
      const { error } = await bucket.upload(key, bytes, { contentType: mime, upsert: true });
      if (error) throw new Error(`Audio upload failed: ${error.message}`);
    },
    async get(key) {
      const { data, error } = await bucket.download(key);
      if (error || !data) return null;
      return { bytes: new Uint8Array(await data.arrayBuffer()), mime: data.type || "audio/webm" };
    },
    async remove(keys) {
      if (!keys.length) return;
      const { error } = await bucket.remove(keys);
      if (error) throw new Error(`Audio delete failed: ${error.message}`);
    },
  };
}

const g = globalThis as typeof globalThis & { __ipcAudioStore?: AudioStore };

export function getAudioStore(): AudioStore {
  if (g.__ipcAudioStore) return g.__ipcAudioStore;
  const env = getEnv();
  g.__ipcAudioStore =
    env.DATA_MODE === "supabase" ? createSupabaseAudioStore(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!) : createMemoryAudioStore();
  return g.__ipcAudioStore;
}
