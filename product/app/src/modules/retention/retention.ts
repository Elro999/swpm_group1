import { AUDIO_RETENTION_DAYS, type AudioStore } from "@/lib/audio";
import type { Repo } from "@/lib/db/types";
import { recordEvent } from "@/modules/events/events";

/**
 * Audio retention (privacy page + consent notice: "Audio is deleted after 30 days"; review fix 2026-11-14).
 * Runs daily from Vercel Cron (/api/cron/retention). Works from STORAGE, not from database rows, so it also
 * catches recordings whose key was lost. Transcripts and feedback are text and are kept until the user deletes them.
 *
 * Order matters: delete the objects, verify they are gone, and only then forget their keys in attempts.
 * If storage deletion fails, rows keep their keys and the next run retries.
 */
const BATCH = 500;
const MAX_BATCHES = 20; // 10,000 recordings per run is far above this MVP's volume; the rest waits for tomorrow

export class RetentionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetentionError";
  }
}

export async function purgeExpiredAudio(
  repo: Repo,
  audio: AudioStore,
  now: Date = new Date(),
  days: number = AUDIO_RETENTION_DAYS,
): Promise<{ deleted: number; cutoff: string }> {
  const before = new Date(now.getTime() - days * 86_400_000);
  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const keys = await audio.list({ before, limit: BATCH });
    if (!keys.length) break;
    await audio.remove(keys);
    const still = new Set(await audio.list({ before, limit: BATCH }));
    const stuck = keys.filter((k) => still.has(k));
    if (stuck.length) throw new RetentionError(`${stuck.length} expired recording(s) could not be deleted`);
    await repo.attempts.clearAudioKeys(keys);
    deleted += keys.length;
    if (keys.length < BATCH) break;
  }
  await recordEvent(repo, null, "audio_retention_run", { deleted, days });
  return { deleted, cutoff: before.toISOString() };
}
