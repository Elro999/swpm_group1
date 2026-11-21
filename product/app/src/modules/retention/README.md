# modules/retention

Keeps the promise on `/privacy` and the consent notice: **audio recordings are deleted after 30 days**. Added 2026-11-14 after both code reviews found the promise was not enforced.

- `purgeExpiredAudio(repo, audio, now?, days = 30)` lists storage objects last written more than 30 days ago (`AudioStore.list({ before })`, SQL `audio_object_names`), deletes them, **checks storage again** that they are gone, and only then clears the matching `answer_audio_key` / `followup_audio_key` on attempts. It works from storage, not rows, so recordings whose key was lost are deleted too. If storage does not delete, it throws `RetentionError` and keeps the keys, so the next run retries. Records an anonymous `audio_retention_run {deleted, days}` event.
- Text (JD, stories, transcripts, feedback) is not touched: the privacy page says it is kept until the user deletes it.
- Runs daily at 03:00 UTC from Vercel Cron (`app/vercel.json` → `GET /api/cron/retention`). The route requires `Authorization: Bearer $CRON_SECRET` (timing-safe check), returns 503 if `CRON_SECRET` is unset, and 500 on failure so the run shows as failed in Vercel's cron log.
- Tests: `retention.test.ts` (old vs new recordings, orphans, keys cleared, text kept, failure keeps keys).
