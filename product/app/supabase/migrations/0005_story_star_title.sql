-- 0005: STAR stories, a title per story, and story delete (2026-11-22).
-- * title: the user's own name for a story (shown on the collapsed card). Optional in the database so older
--   stories and discovery drafts stay valid; the "My stories" form asks for it.
-- * format: 'star' (each sentence in `sentences` carries a part: situation | task | action | result) or
--   'sdr' (older decision-first stories with situation / decision / result spans). Existing rows are 'sdr';
--   the app writes 'star' for every new or edited story.
-- * Deleting a story needs no schema change: competency_map rows already cascade (0003).

alter table stories add column if not exists title text check (title is null or char_length(title) between 1 and 80);
alter table stories add column if not exists format text not null default 'sdr' check (format in ('sdr', 'star'));

comment on column stories.title is 'The user''s own name for the story (max 80 characters); null for discovery drafts and older stories.';
comment on column stories.format is 'star = sentences carry a STAR part; sdr = older decision-first story.';
