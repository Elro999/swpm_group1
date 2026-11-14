-- 0001_init.sql: initial schema for the Interview Prep Companion (MVP1).
-- Source of truth for the model: product/02_capability-and-architecture.md §3.
-- How to apply (setup step S1): Supabase dashboard → SQL editor → paste this file → Run.
--
-- Security model: the browser NEVER talks to Supabase. All access is server-side with the
-- service-role key. RLS is enabled on every table with NO policies, so the anon key can read nothing.
-- Every row hangs off sessions(id) with ON DELETE CASCADE, so "Delete my data" is one delete.
-- Privacy: events.props and ai_calls must never contain transcript, story, JD or CV text.

create extension if not exists pgcrypto;

-- One anonymous user = one session. token_hash = sha256(hex) of the 256-bit token in the cookie / resume link.
create table sessions (
  id            uuid primary key default gen_random_uuid(),
  token_hash    text not null unique,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  consent_at    timestamptz,
  deleted_at    timestamptz
);
comment on table sessions is 'Anonymous user session (PF1). No personal fields by design.';

-- One interview the candidate is preparing for (JD pasted by the user).
create table interviews (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id) on delete cascade,
  jd_text         text not null check (char_length(jd_text) <= 10000),
  cv_text         text check (char_length(cv_text) <= 20000),
  interview_date  date,
  created_at      timestamptz not null default now()
);
create index on interviews(session_id);
comment on table interviews is 'An interview being prepared for: JD and optional CV/date (US-0.2).';

-- 4–6 competencies extracted from the JD; jd_quote must be a verbatim substring of jd_text.
create table competencies (
  id              uuid primary key default gen_random_uuid(),
  interview_id    uuid not null references interviews(id) on delete cascade,
  label           text not null,
  jd_quote        text not null,
  jd_quote_start  int not null,
  jd_quote_end    int not null,
  ord             int not null
);
create index on competencies(interview_id);
comment on table competencies is 'JD competencies with exact JD quote offsets (SB4, MF1).';

-- 3–5 behavioural questions, each tied to one competency.
create table questions (
  id              uuid primary key default gen_random_uuid(),
  interview_id    uuid not null references interviews(id) on delete cascade,
  competency_id   uuid references competencies(id) on delete set null,
  text            text not null,
  jd_quote        text not null,
  ord             int not null
);
create index on questions(interview_id);
comment on table questions is 'Fit/behavioural questions generated from the JD (MF1).';

-- Story bank. Structured fields are spans of raw_text, never invented (SB5 / G-NO-INVENT).
create table stories (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  raw_text    text not null check (char_length(raw_text) <= 20000),
  source      text not null default 'pasted' check (source in ('pasted', 'discovery')),
  state       text not null default 'draft' check (state in ('draft', 'structured', 'ready')),
  situation   text,
  decision    text,
  result      text,
  spans       jsonb not null default '{}'::jsonb,   -- {situation:[start,end], decision:[...], result:[...]}
  sentences   jsonb not null default '[]'::jsonb,   -- [{text,start,end,actor:'own'|'team'|'unclear',flags:[]}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on stories(session_id);
comment on table stories is 'Story bank, decision first, team vs own split (SB1–SB5, SD2).';

-- Mapping of each competency to one story, or a gap (G3: every competency has one or the other).
create table competency_map (
  competency_id    uuid primary key references competencies(id) on delete cascade,
  story_id         uuid references stories(id) on delete set null,
  is_gap           boolean not null default false,
  rationale_quote  text,
  check (is_gap or story_id is not null)
);
comment on table competency_map is 'Competency → story or gap (SB4, G3).';

-- One recorded attempt at a question: main answer + optional single follow-up (MF2, MF3, MF6).
create table attempts (
  id                   uuid primary key default gen_random_uuid(),
  question_id          uuid not null references questions(id) on delete cascade,
  attempt_no           int not null check (attempt_no >= 1),
  status               text not null default 'created' check (status in (
                         'created', 'uploaded', 'transcribing', 'transcribed', 'followup_ready',
                         'followup_uploaded', 'followup_transcribed', 'analysing', 'ready', 'failed')),
  answer_audio_key     text,
  answer_words         jsonb,      -- [{w, start, end}] in ms
  answer_text          text,
  followup_text        text,
  followup_quote       text,
  followup_audio_key   text,
  followup_words       jsonb,
  error                text,       -- human-readable reason when status = 'failed'
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (question_id, attempt_no)
);
create index on attempts(question_id);
comment on table attempts is 'Voice attempt with transcript and state machine (doc 02 §4).';

-- Feedback points. Every point quotes the transcript (G2); unverifiable points are dropped before insert.
create table feedback_points (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references attempts(id) on delete cascade,
  check_id        text not null,   -- stable id so retries can be compared (MF6)
  kind            text not null check (kind in ('delivery', 'fit')),
  severity        text not null default 'info' check (severity in ('info', 'warn', 'fix')),
  message         text not null,
  quote           text not null,
  quote_start_ms  int not null,
  quote_end_ms    int not null,
  created_at      timestamptz not null default now()
);
create index on feedback_points(attempt_id);
comment on table feedback_points is 'Pinned feedback; quote is verbatim from the transcript (MF4, MF5, G2).';

-- Deterministic delivery metrics + the two fit verdicts for one attempt.
create table feedback_metrics (
  attempt_id           uuid primary key references attempts(id) on delete cascade,
  time_to_decision_ms  int,          -- null when no decision sentence was found
  i_count              int not null,
  we_count             int not null,
  duration_ms          int not null,
  answered_question    boolean,
  competency_shown     boolean
);
comment on table feedback_metrics is 'Per-attempt metrics used for before vs after (MF4, MF6).';

-- "Not useful" flags on feedback points (MF7); feeds the review queue.
create table point_ratings (
  feedback_point_id  uuid primary key references feedback_points(id) on delete cascade,
  not_useful         boolean not null default true,
  reason             text check (char_length(reason) <= 500),
  created_at         timestamptz not null default now()
);

-- Light prep list (PL1, PL2).
create table prep_items (
  id             uuid primary key default gen_random_uuid(),
  interview_id   uuid not null references interviews(id) on delete cascade,
  kind           text not null check (kind in ('story', 'question')),
  ref_id         uuid not null,
  block_minutes  int not null default 20,
  done           boolean not null default false,
  ord            int not null
);
create index on prep_items(interview_id);

-- Product analytics events (PF3). props: small primitives only, NEVER user text.
create table events (
  id          bigint generated always as identity primary key,
  session_id  uuid references sessions(id) on delete cascade,
  name        text not null,
  props       jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);
create index on events(name, at);
create index on events(session_id);

-- AI call log for cost/latency visibility. No prompt or output content.
create table ai_calls (
  id             bigint generated always as identity primary key,
  session_id     uuid references sessions(id) on delete cascade,
  purpose        text not null,
  provider       text not null,
  model          text not null,
  latency_ms     int not null,
  input_tokens   int,
  output_tokens  int,
  audio_ms       int,
  status         text not null check (status in ('ok', 'error')),
  at             timestamptz not null default now()
);
create index on ai_calls(session_id, at);

-- Lock everything down: RLS on, no policies → anon/authenticated roles get nothing.
alter table sessions         enable row level security;
alter table interviews       enable row level security;
alter table competencies     enable row level security;
alter table questions        enable row level security;
alter table stories          enable row level security;
alter table competency_map   enable row level security;
alter table attempts         enable row level security;
alter table feedback_points  enable row level security;
alter table feedback_metrics enable row level security;
alter table point_ratings    enable row level security;
alter table prep_items       enable row level security;
alter table events           enable row level security;
alter table ai_calls         enable row level security;

-- Private audio bucket (MF2). Create it here so setup is one paste.
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;
