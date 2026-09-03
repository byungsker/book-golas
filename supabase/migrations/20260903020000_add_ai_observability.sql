create or replace function public.sanitize_ai_observability_metadata(payload jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_object_agg(item.key, item.value),
    '{}'::jsonb
  )
  from jsonb_each(
    case when jsonb_typeof(payload) = 'object' then payload else '{}'::jsonb end
  ) as item(key, value)
  where item.key = any(array[
    'activeRequests',
    'concurrencyLimit',
    'inputCharsUsed',
    'inputLimit',
    'observedValue',
    'projectedCostUsd',
    'requestInputLimit',
    'requestLimit',
    'requestsInDay',
    'requestsInMinute',
    'requestsUsed',
    'sampleCount',
    'threshold',
    'window'
  ])
  and jsonb_typeof(item.value) in ('string', 'number', 'boolean', 'null');
$$;

create or replace function public.is_safe_ai_observability_metadata(payload jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select public.sanitize_ai_observability_metadata(payload) =
    case when jsonb_typeof(payload) = 'object' then payload else '{}'::jsonb end;
$$;

alter table public.ai_usage_logs
  add column if not exists event_version integer default 1,
  add column if not exists request_id text,
  add column if not exists call_id text,
  add column if not exists outcome text;

update public.ai_usage_logs
set event_version = 1
where event_version is null;

update public.ai_usage_logs
set outcome = case
  when status = 'success' then 'success'
  when error_code in ('provider_timeout', 'timeout', 'aborted') then 'timeout'
  when error_code = 'rate_limit_exceeded' or error_code like '%rate_limit%' or error_code like '%rate-limit%' then 'rate_limited'
  else 'failure'
end
where outcome is null;

alter table public.ai_usage_logs
  alter column event_version set default 1,
  alter column event_version set not null,
  alter column outcome set default 'failure',
  alter column outcome set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_logs_event_version_check'
  ) then
    alter table public.ai_usage_logs
      add constraint ai_usage_logs_event_version_check
      check (event_version = 1);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_logs_request_id_check'
  ) then
    alter table public.ai_usage_logs
      add constraint ai_usage_logs_request_id_check
      check (request_id is null or request_id ~ '^[A-Za-z0-9._:-]{1,64}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_logs_call_id_check'
  ) then
    alter table public.ai_usage_logs
      add constraint ai_usage_logs_call_id_check
      check (call_id is null or call_id ~ '^[A-Za-z0-9._:-]{1,64}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_logs_outcome_check'
  ) then
    alter table public.ai_usage_logs
      add constraint ai_usage_logs_outcome_check
      check (outcome in ('success', 'failure', 'timeout', 'rate_limited', 'blocked'));
  end if;
end;
$$;

create index if not exists ai_usage_logs_request_created_idx
  on public.ai_usage_logs (request_id, created_at desc)
  where request_id is not null;
create index if not exists ai_usage_logs_call_created_idx
  on public.ai_usage_logs (call_id, created_at desc)
  where call_id is not null;

alter table public.ai_usage_control_events
  add column if not exists event_version integer default 1,
  add column if not exists request_id text,
  add column if not exists call_id text,
  add column if not exists outcome text;

update public.ai_usage_control_events
set event_version = 1
where event_version is null;

update public.ai_usage_control_events
set outcome = case
  when reason in ('provider_timeout', 'timeout', 'aborted') then 'timeout'
  when reason = 'rate_limit_exceeded' or reason like '%rate_limit%' or reason like '%rate-limit%' then 'rate_limited'
  when decision = 'block' or event_type = 'reservation_blocked' then 'blocked'
  when event_type = 'provider_error' then 'failure'
  else 'success'
end
where outcome is null;

update public.ai_usage_control_events
set metadata = public.sanitize_ai_observability_metadata(metadata)
where not public.is_safe_ai_observability_metadata(metadata);

alter table public.ai_usage_control_events
  alter column event_version set default 1,
  alter column event_version set not null,
  alter column outcome set default 'success',
  alter column outcome set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_control_events_event_version_check'
  ) then
    alter table public.ai_usage_control_events
      add constraint ai_usage_control_events_event_version_check
      check (event_version = 1);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_control_events_request_id_check'
  ) then
    alter table public.ai_usage_control_events
      add constraint ai_usage_control_events_request_id_check
      check (request_id is null or request_id ~ '^[A-Za-z0-9._:-]{1,64}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_control_events_call_id_check'
  ) then
    alter table public.ai_usage_control_events
      add constraint ai_usage_control_events_call_id_check
      check (call_id is null or call_id ~ '^[A-Za-z0-9._:-]{1,64}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_control_events_outcome_check'
  ) then
    alter table public.ai_usage_control_events
      add constraint ai_usage_control_events_outcome_check
      check (outcome in ('success', 'failure', 'timeout', 'rate_limited', 'blocked'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_control_events_metadata_safe_check'
  ) then
    alter table public.ai_usage_control_events
      add constraint ai_usage_control_events_metadata_safe_check
      check (public.is_safe_ai_observability_metadata(metadata));
  end if;
end;
$$;

create index if not exists ai_usage_control_events_request_created_idx
  on public.ai_usage_control_events (request_id, created_at desc)
  where request_id is not null;
create index if not exists ai_usage_control_events_call_created_idx
  on public.ai_usage_control_events (call_id, created_at desc)
  where call_id is not null;

create or replace function public.normalize_ai_usage_log_observability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.event_version := coalesce(new.event_version, 1);
  new.outcome := case
    when new.status = 'success' then 'success'
    when new.error_code in ('provider_timeout', 'timeout', 'aborted') then 'timeout'
    when new.error_code = 'rate_limit_exceeded' or new.error_code like '%rate_limit%' or new.error_code like '%rate-limit%' then 'rate_limited'
    else 'failure'
  end;
  return new;
end;
$$;

drop trigger if exists ai_usage_logs_observability_defaults on public.ai_usage_logs;
create trigger ai_usage_logs_observability_defaults
before insert or update on public.ai_usage_logs
for each row execute function public.normalize_ai_usage_log_observability();

create or replace function public.normalize_ai_usage_control_observability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.event_version := coalesce(new.event_version, 1);
  new.outcome := case
    when new.reason in ('provider_timeout', 'timeout', 'aborted') then 'timeout'
    when new.reason = 'rate_limit_exceeded' or new.reason like '%rate_limit%' or new.reason like '%rate-limit%' then 'rate_limited'
    when new.decision = 'block' or new.event_type = 'reservation_blocked' then 'blocked'
    when new.event_type = 'provider_error' then 'failure'
    else 'success'
  end;
  return new;
end;
$$;

drop trigger if exists ai_usage_control_events_observability_defaults on public.ai_usage_control_events;
create trigger ai_usage_control_events_observability_defaults
before insert or update on public.ai_usage_control_events
for each row execute function public.normalize_ai_usage_control_observability();

alter table public.ai_usage_leases
  add column if not exists request_id text,
  add column if not exists call_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_leases_request_id_check'
  ) then
    alter table public.ai_usage_leases
      add constraint ai_usage_leases_request_id_check
      check (request_id is null or request_id ~ '^[A-Za-z0-9._:-]{1,64}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_leases_call_id_check'
  ) then
    alter table public.ai_usage_leases
      add constraint ai_usage_leases_call_id_check
      check (call_id is null or call_id ~ '^[A-Za-z0-9._:-]{1,64}$');
  end if;
end;
$$;

create or replace function public.reserve_ai_usage(
  p_feature text,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_input_chars integer,
  p_estimated_input_tokens integer,
  p_estimated_output_tokens integer,
  p_estimated_cost_usd numeric,
  p_request_id text,
  p_call_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_started_at timestamptz := now();
  v_result jsonb;
  v_lease_id uuid;
  v_request_id text := case
    when p_request_id ~ '^[A-Za-z0-9._:-]{1,64}$' then p_request_id
    else null
  end;
  v_call_id text := case
    when p_call_id ~ '^[A-Za-z0-9._:-]{1,64}$' then p_call_id
    else null
  end;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  v_result := public.reserve_ai_usage(
    p_feature,
    p_provider,
    p_model,
    p_prompt_version,
    p_input_chars,
    p_estimated_input_tokens,
    p_estimated_output_tokens,
    p_estimated_cost_usd
  );

  if coalesce((v_result ->> 'allowed')::boolean, false) then
    begin
      v_lease_id := (v_result ->> 'leaseId')::uuid;
    exception when invalid_text_representation then
      v_lease_id := null;
    end;
    if v_lease_id is not null then
      update public.ai_usage_leases
      set request_id = v_request_id,
          call_id = v_call_id
      where id = v_lease_id and user_id = v_actor_id;
    end if;
  end if;

  update public.ai_usage_control_events
  set request_id = v_request_id,
      call_id = v_call_id
  where id = (
    select id
    from public.ai_usage_control_events
    where user_id = v_actor_id
      and created_at >= v_started_at
      and event_type in ('reservation_allowed', 'reservation_blocked')
    order by created_at desc, id desc
    limit 1
  );

  return v_result;
end;
$$;

create or replace function public.release_ai_usage(p_lease_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lease public.ai_usage_leases%rowtype;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_lease
  from public.ai_usage_leases
  where id = p_lease_id
    and user_id = v_actor_id
  for update;

  if not found then
    return false;
  end if;

  delete from public.ai_usage_leases where id = p_lease_id;

  insert into public.ai_usage_control_events (
    event_version,
    user_id,
    request_id,
    call_id,
    function_name,
    feature,
    provider,
    model,
    prompt_version,
    event_type,
    decision,
    outcome,
    reason,
    estimated_cost_usd,
    metadata
  )
  values (
    1,
    v_actor_id,
    v_lease.request_id,
    v_lease.call_id,
    left(split_part(v_lease.feature, '.', 1), 100),
    v_lease.feature,
    v_lease.provider,
    v_lease.model,
    v_lease.prompt_version,
    'lease_released',
    'observe',
    'success',
    'lease_released',
    v_lease.reserved_cost_usd,
    '{}'::jsonb
  );
  return true;
end;
$$;

create or replace function public.get_ai_observability_health(
  p_window_hours integer default 24
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_window_hours integer := least(greatest(coalesce(p_window_hours, 24), 1), 168);
  v_window_start timestamptz := now() - make_interval(hours => v_window_hours);
  v_log_count integer;
  v_control_count integer;
  v_allowed_count integer;
  v_terminal_count integer;
  v_failure_count integer;
  v_timeout_count integer;
  v_rate_limited_count integer;
  v_missing_count integer;
  v_coverage numeric;
  v_p95_latency numeric;
  v_latest_event_at timestamptz;
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select count(*)::integer,
         count(*) filter (where outcome = 'failure')::integer,
         count(*) filter (where outcome = 'timeout')::integer,
         count(*) filter (where outcome = 'rate_limited')::integer,
         max(created_at)
    into v_log_count, v_failure_count, v_timeout_count,
         v_rate_limited_count, v_latest_event_at
  from public.ai_usage_logs
  where created_at >= v_window_start;

  select count(*)::integer,
         count(*) filter (where event_type = 'reservation_allowed')::integer,
         max(created_at)
    into v_control_count, v_allowed_count,
         v_latest_event_at
  from public.ai_usage_control_events
  where created_at >= v_window_start;

  select count(*)::integer
    into v_terminal_count
  from public.ai_usage_logs
  where created_at >= v_window_start
    and request_id is not null
    and call_id is not null;

  v_latest_event_at := greatest(
    v_latest_event_at,
    (select max(created_at) from public.ai_usage_logs where created_at >= v_window_start)
  );
  v_missing_count := greatest(v_allowed_count - v_terminal_count, 0);
  v_coverage := case
    when v_allowed_count = 0 then null
    else round(least(v_terminal_count::numeric / v_allowed_count * 100, 100), 1)
  end;

  select percentile_cont(0.95) within group (order by latency_ms)
    into v_p95_latency
  from public.ai_usage_logs
  where created_at >= v_window_start;

  v_status := case
    when v_log_count = 0 and v_control_count = 0 then 'unknown'
    when v_coverage is not null and v_coverage < 80 then 'critical'
    when v_coverage is not null and v_coverage < 100 then 'warning'
    when v_latest_event_at is null then 'unknown'
    when v_latest_event_at < now() - interval '1 hour' then 'warning'
    else 'healthy'
  end;

  return jsonb_build_object(
    'eventVersion', 1,
    'windowHours', v_window_hours,
    'status', v_status,
    'coveragePercent', v_coverage,
    'allowedReservations', v_allowed_count,
    'terminalEvents', v_terminal_count,
    'missingTerminalEvents', v_missing_count,
    'p95LatencyMs', case when v_p95_latency is null then null else round(v_p95_latency)::integer end,
    'logCount', v_log_count,
    'controlEventCount', v_control_count,
    'failureCount', v_failure_count,
    'timeoutCount', v_timeout_count,
    'rateLimitedCount', v_rate_limited_count,
    'latestEventAt', v_latest_event_at,
    'sinkHealthy', v_status in ('healthy', 'warning')
  );
end;
$$;

revoke all on function public.reserve_ai_usage(text, text, text, text, integer, integer, integer, numeric, text, text) from public, anon;
grant execute on function public.reserve_ai_usage(text, text, text, text, integer, integer, integer, numeric, text, text) to authenticated;
revoke all on function public.release_ai_usage(uuid) from public, anon;
grant execute on function public.release_ai_usage(uuid) to authenticated;
revoke all on function public.get_ai_observability_health(integer) from public, anon, authenticated;
grant execute on function public.get_ai_observability_health(integer) to service_role;

revoke all on function public.sanitize_ai_observability_metadata(jsonb) from public, anon, authenticated;
revoke all on function public.is_safe_ai_observability_metadata(jsonb) from public, anon, authenticated;
revoke all on function public.normalize_ai_usage_log_observability() from public, anon, authenticated;
revoke all on function public.normalize_ai_usage_control_observability() from public, anon, authenticated;
