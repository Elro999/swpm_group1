-- 0004: fixes from the 2026-11-14 adversarial code reviews (see product/log.md).
-- All functions are SECURITY DEFINER for the server's service role only: anon/authenticated get nothing.

-- 1. Atomic AI quota. A call reserves a "pending" row before the provider is called, so concurrent requests
--    cannot both take the last slot. Calls stay counted after a user deletes their data (unlinked, no content),
--    so deleting a session cannot reset the deployment-wide cap.
alter table ai_calls drop constraint if exists ai_calls_status_check;
alter table ai_calls add constraint ai_calls_status_check check (status in ('pending', 'ok', 'error'));
alter table ai_calls drop constraint if exists ai_calls_session_id_fkey;
alter table ai_calls add constraint ai_calls_session_id_fkey foreign key (session_id) references sessions(id) on delete set null;
create index if not exists ai_calls_at_idx on ai_calls(at);

create or replace function reserve_ai_call(
  p_session uuid, p_purpose text, p_provider text, p_session_limit int, p_global_limit int, p_since timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('ai_call_quota'));
  if (select count(*) from ai_calls where at >= p_since) >= p_global_limit then
    return jsonb_build_object('denied', 'global');
  end if;
  if p_session is not null and (select count(*) from ai_calls where session_id = p_session and at >= p_since) >= p_session_limit then
    return jsonb_build_object('denied', 'session');
  end if;
  insert into ai_calls (session_id, purpose, provider, model, latency_ms, status)
  values (p_session, p_purpose, p_provider, 'pending', 0, 'pending')
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- 2. Fixed-window rate limits (used to throttle anonymous session creation per hashed IP).
create table if not exists rate_limits (
  key           text primary key,
  window_start  timestamptz not null,
  hits          int not null
);
alter table rate_limits enable row level security;
comment on table rate_limits is 'Fixed-window counters; keys are hashes (no raw IPs).';

create or replace function hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_hits int;
  v_cut timestamptz := now() - make_interval(secs => p_window_seconds);
begin
  insert into rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits         = case when r.window_start <= v_cut then 1 else r.hits + 1 end,
    window_start = case when r.window_start <= v_cut then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;

-- 3. Exclusive processing lease on attempts, so two requests never run the same step at once.
alter table attempts add column if not exists processing_until timestamptz;

-- 4. Save feedback and mark the attempt ready in one transaction.
create or replace function save_feedback(p_attempt uuid, p_metrics jsonb, p_points jsonb) returns setof feedback_points
language plpgsql security definer set search_path = public as $$
begin
  delete from feedback_points where attempt_id = p_attempt;
  insert into feedback_metrics (attempt_id, time_to_decision_ms, i_count, we_count, duration_ms, answered_question, competency_shown)
  values (
    p_attempt,
    (p_metrics->>'time_to_decision_ms')::int,
    (p_metrics->>'i_count')::int,
    (p_metrics->>'we_count')::int,
    (p_metrics->>'duration_ms')::int,
    (p_metrics->>'answered_question')::boolean,
    (p_metrics->>'competency_shown')::boolean
  )
  on conflict (attempt_id) do update set
    time_to_decision_ms = excluded.time_to_decision_ms, i_count = excluded.i_count, we_count = excluded.we_count,
    duration_ms = excluded.duration_ms, answered_question = excluded.answered_question, competency_shown = excluded.competency_shown;
  insert into feedback_points (attempt_id, check_id, kind, severity, message, quote, quote_start_ms, quote_end_ms)
  select p_attempt, x.check_id, x.kind, x.severity, x.message, x.quote, x.quote_start_ms, x.quote_end_ms
  from jsonb_to_recordset(coalesce(p_points, '[]'::jsonb))
    as x(check_id text, kind text, severity text, message text, quote text, quote_start_ms int, quote_end_ms int);
  update attempts set status = 'ready', error = null, updated_at = now() where id = p_attempt;
  return query select * from feedback_points where attempt_id = p_attempt order by quote_start_ms;
end $$;

-- 5. List audio objects by key prefix and/or age (session deletion sweep and 30-day retention).
create or replace function audio_object_names(p_prefix text, p_before timestamptz, p_limit int) returns setof text
language sql stable security definer set search_path = storage, public as $$
  select o.name from storage.objects o
  where o.bucket_id = 'audio'
    and (p_prefix is null or left(o.name, length(p_prefix)) = p_prefix)
    and (p_before is null or coalesce(o.updated_at, o.created_at) < p_before)
  order by coalesce(o.updated_at, o.created_at)
  limit p_limit
$$;

revoke all on function reserve_ai_call(uuid, text, text, int, int, timestamptz) from public, anon, authenticated;
revoke all on function hit_rate_limit(text, int, int) from public, anon, authenticated;
revoke all on function save_feedback(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function audio_object_names(text, timestamptz, int) from public, anon, authenticated;
grant execute on function reserve_ai_call(uuid, text, text, int, int, timestamptz) to service_role;
grant execute on function hit_rate_limit(text, int, int) to service_role;
grant execute on function save_feedback(uuid, jsonb, jsonb) to service_role;
grant execute on function audio_object_names(text, timestamptz, int) to service_role;
