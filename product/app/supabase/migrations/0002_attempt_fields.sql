-- 0002_attempt_fields.sql: fields the Phase 2 attempt pipeline needs.
-- Apply after 0001 in the Supabase SQL editor. Additive only; no existing data changes.

alter table attempts
  add column if not exists answer_audio_mime    text,
  add column if not exists answer_duration_ms   int check (answer_duration_ms is null or answer_duration_ms >= 0),
  add column if not exists followup_audio_mime  text,
  add column if not exists followup_skipped     boolean not null default false;

comment on column attempts.followup_skipped is 'User chose to skip the single follow-up (MF3); analysis then runs on the main answer only.';
