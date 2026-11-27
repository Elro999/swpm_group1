-- 0007: STAR on practice answers and "save my answer to My stories" (built 2026-11-27). Additive only.
-- * attempts.answer_star: the STAR part (situation / task / action / result) of each sentence of the answer,
--   in sentence order. Every label sits on one of the user's own sentences; nothing is rewritten.
-- * attempts.story_id: the My stories entry this answer was saved to (new) or combined into (existing).
--   Deleting the story keeps the attempt and clears the link.
-- * stories.source gains 'practice' (a story saved from a practice answer).

alter table attempts add column if not exists answer_star jsonb;
comment on column attempts.answer_star is 'STAR part per answer sentence (array, sentence order); null when not sorted.';

alter table attempts add column if not exists story_id uuid references stories(id) on delete set null;
comment on column attempts.story_id is 'Story this practice answer was saved to or combined into.';

alter table stories drop constraint if exists stories_source_check;
alter table stories add constraint stories_source_check check (source in ('pasted', 'discovery', 'practice'));
