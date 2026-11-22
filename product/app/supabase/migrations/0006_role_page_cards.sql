-- 0006: merged question cards on the role page (design/01, built 2026-11-22). Additive only.
-- * competency_prompts: CV prompts saved per competency when the role page first loads, so each card shows
--   them without a click and "Build story" links can carry IDs only (never CV or question text).
-- * competency_map.chosen_by_user: the user picked (or swapped in) this story by hand; automatic matching
--   never replaces it.
-- * interviews.matched_at: when stories were last matched for this interview; stories added after it show
--   "Match new story".

create table if not exists competency_prompts (
  id             uuid primary key default gen_random_uuid(),
  competency_id  uuid not null references competencies(id) on delete cascade,
  ord            int not null,
  text           text not null check (char_length(text) <= 400),
  refs           jsonb not null default '[]'::jsonb,  -- verbatim CV lines the prompt quotes
  created_at     timestamptz not null default now()
);
create index if not exists competency_prompts_competency_idx on competency_prompts(competency_id);
alter table competency_prompts enable row level security;
comment on table competency_prompts is 'CV prompts per competency (SD1); refs are verbatim CV lines.';

alter table competency_map add column if not exists chosen_by_user boolean not null default false;
comment on column competency_map.chosen_by_user is 'The user picked this story by hand; automatic matching never replaces it.';

alter table interviews add column if not exists matched_at timestamptz;
comment on column interviews.matched_at is 'Last time stories were matched for this interview.';
