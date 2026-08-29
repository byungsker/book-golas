create table if not exists public.ai_pricing_registry (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('open_ai')),
  model text not null check (btrim(model) <> '' and length(model) <= 160),
  currency text not null check (currency = 'USD'),
  input_usd_per_million_tokens numeric(18, 12) not null check (input_usd_per_million_tokens >= 0),
  output_usd_per_million_tokens numeric(18, 12) not null check (output_usd_per_million_tokens >= 0),
  effective_from timestamptz not null,
  effective_until timestamptz,
  approved boolean not null default false,
  approval_ref text not null check (btrim(approval_ref) <> '' and length(approval_ref) <= 240),
  created_at timestamptz not null default now(),
  unique (provider, model, effective_from),
  check (effective_until is null or effective_until > effective_from)
);

create or replace function public.prevent_ai_pricing_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'ai pricing registry is append-only';
end;
$$;

drop trigger if exists ai_pricing_registry_immutable on public.ai_pricing_registry;
create trigger ai_pricing_registry_immutable
before update or delete on public.ai_pricing_registry
for each row execute function public.prevent_ai_pricing_mutation();

insert into public.ai_pricing_registry (
  provider,
  model,
  currency,
  input_usd_per_million_tokens,
  output_usd_per_million_tokens,
  effective_from,
  approved,
  approval_ref
)
values
  (
    'open_ai',
    'gpt-4o-mini',
    'USD',
    0.15,
    0.6,
    '2026-08-29T00:00:00Z',
    true,
    'openai-model-page-gpt-4o-mini-2026-08-29'
  ),
  (
    'open_ai',
    'text-embedding-3-small',
    'USD',
    0.02,
    0,
    '2026-08-29T00:00:00Z',
    true,
    'openai-model-page-text-embedding-3-small-2026-08-29'
  )
on conflict (provider, model, effective_from) do nothing;

create table if not exists public.ai_usage_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null check (policy_key = 'default'),
  policy_version text not null check (btrim(policy_version) <> '' and length(policy_version) <= 80),
  requests_per_minute integer not null check (requests_per_minute > 0),
  requests_per_day integer not null check (requests_per_day > 0),
  budget_usd_per_day numeric(18, 8) not null check (budget_usd_per_day > 0),
  hard_cap_usd_per_day numeric(18, 8) not null check (hard_cap_usd_per_day >= budget_usd_per_day),
  concurrent_requests integer not null check (concurrent_requests > 0),
  warning_ratio numeric(5, 4) not null check (warning_ratio > 0 and warning_ratio < 1),
  critical_ratio numeric(5, 4) not null check (critical_ratio > warning_ratio and critical_ratio < 1),
  effective_from timestamptz not null,
  created_at timestamptz not null default now(),
  unique (policy_key, effective_from)
);

insert into public.ai_usage_policy_versions (
  policy_key,
  policy_version,
  requests_per_minute,
  requests_per_day,
  budget_usd_per_day,
  hard_cap_usd_per_day,
  concurrent_requests,
  warning_ratio,
  critical_ratio,
  effective_from
)
values (
  'default',
  'cost-control-v1',
  10,
  30,
  0.05,
  0.1,
  3,
  0.8,
  0.9,
  '2026-08-29T00:00:00Z'
)
on conflict (policy_key, effective_from) do nothing;

alter table public.ai_pricing_registry enable row level security;
alter table public.ai_usage_policy_versions enable row level security;

alter table public.ai_usage_logs add column if not exists provider text;
alter table public.ai_usage_logs add column if not exists feature text;
alter table public.ai_usage_logs add column if not exists pricing_version text;
alter table public.ai_usage_logs add column if not exists pricing_status text;
alter table public.ai_usage_logs add column if not exists token_status text;
alter table public.ai_usage_logs add column if not exists usage_source text;
alter table public.ai_usage_logs add column if not exists control_status text;

update public.ai_usage_logs
set provider = 'open_ai'
where provider is null;

update public.ai_usage_logs
set feature = function_name
where feature is null;

update public.ai_usage_logs
set pricing_version = 'legacy-v1'
where pricing_version is null;

update public.ai_usage_logs
set pricing_status = case when estimated_cost_usd is null then 'not_finalized' else 'finalized' end
where pricing_status is null;

update public.ai_usage_logs
set token_status = case when input_tokens is null then 'missing' else 'valid' end
where token_status is null;

update public.ai_usage_logs
set usage_source = case when input_tokens is null then 'none' else 'provider' end
where usage_source is null;

update public.ai_usage_logs
set control_status = 'allowed'
where control_status is null;

alter table public.ai_usage_logs alter column provider set default 'open_ai';
alter table public.ai_usage_logs alter column provider set not null;
alter table public.ai_usage_logs alter column feature set not null;
alter table public.ai_usage_logs alter column pricing_version set not null;
alter table public.ai_usage_logs alter column pricing_status set not null;
alter table public.ai_usage_logs alter column token_status set not null;
alter table public.ai_usage_logs alter column usage_source set not null;
alter table public.ai_usage_logs alter column control_status set not null;

alter table public.ai_usage_logs
  add constraint ai_usage_logs_provider_check
  check (provider in ('open_ai'));
alter table public.ai_usage_logs
  add constraint ai_usage_logs_pricing_status_check
  check (pricing_status in ('finalized', 'not_finalized', 'unavailable'));
alter table public.ai_usage_logs
  add constraint ai_usage_logs_token_status_check
  check (token_status in ('valid', 'missing', 'anomalous', 'inconsistent'));
alter table public.ai_usage_logs
  add constraint ai_usage_logs_usage_source_check
  check (usage_source in ('provider', 'input_estimate', 'none'));
alter table public.ai_usage_logs
  add constraint ai_usage_logs_control_status_check
  check (control_status in ('allowed', 'blocked'));

create index if not exists ai_usage_logs_feature_model_created_idx
  on public.ai_usage_logs (feature, model, created_at desc);

alter table public.ai_usage_leases add column if not exists feature text;
alter table public.ai_usage_leases add column if not exists provider text;
alter table public.ai_usage_leases add column if not exists model text;
alter table public.ai_usage_leases add column if not exists prompt_version text;
alter table public.ai_usage_leases add column if not exists reserved_cost_usd numeric(18, 8);

update public.ai_usage_leases
set feature = 'legacy', provider = 'open_ai', model = 'gpt-4o-mini',
    prompt_version = 'legacy-v1', reserved_cost_usd = 0
where feature is null or provider is null or model is null or prompt_version is null or reserved_cost_usd is null;

alter table public.ai_usage_leases alter column feature set default 'legacy';
alter table public.ai_usage_leases alter column provider set default 'open_ai';
alter table public.ai_usage_leases alter column model set default 'gpt-4o-mini';
alter table public.ai_usage_leases alter column prompt_version set default 'legacy-v1';
alter table public.ai_usage_leases alter column reserved_cost_usd set default 0;
alter table public.ai_usage_leases alter column feature set not null;
alter table public.ai_usage_leases alter column provider set not null;
alter table public.ai_usage_leases alter column model set not null;
alter table public.ai_usage_leases alter column prompt_version set not null;
alter table public.ai_usage_leases alter column reserved_cost_usd set not null;

create table if not exists public.ai_usage_control_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  function_name text not null check (btrim(function_name) <> '' and length(function_name) <= 100),
  feature text not null check (btrim(feature) <> '' and length(feature) <= 120),
  provider text not null check (btrim(provider) <> '' and length(provider) <= 40),
  model text not null check (btrim(model) <> '' and length(model) <= 160),
  prompt_version text not null check (btrim(prompt_version) <> '' and length(prompt_version) <= 80),
  event_type text not null check (event_type in ('reservation_allowed', 'reservation_blocked', 'provider_error', 'usage_rejected', 'lease_released')),
  decision text not null check (decision in ('allow', 'block', 'observe')),
  reason text not null check (btrim(reason) <> '' and length(reason) <= 120),
  estimated_cost_usd numeric(18, 8) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  input_tokens integer check (input_tokens is null or input_tokens between 0 and 1000000),
  output_tokens integer check (output_tokens is null or output_tokens between 0 and 1000000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.ai_usage_control_events enable row level security;
revoke all on table public.ai_usage_control_events from public, anon, authenticated, service_role;
grant select, insert on table public.ai_usage_control_events to service_role;

create index if not exists ai_usage_control_events_user_created_idx
  on public.ai_usage_control_events (user_id, created_at desc);
create index if not exists ai_usage_control_events_reason_created_idx
  on public.ai_usage_control_events (reason, created_at desc);

create or replace function public.reserve_ai_usage(
  p_feature text,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_input_chars integer,
  p_estimated_input_tokens integer,
  p_estimated_output_tokens integer,
  p_estimated_cost_usd numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_now timestamptz := now();
  v_window_start timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_minute_start timestamptz := date_trunc('minute', v_now at time zone 'UTC') at time zone 'UTC';
  v_feature text := left(coalesce(nullif(btrim(p_feature), ''), 'unknown'), 120);
  v_function_name text := left(split_part(coalesce(nullif(btrim(p_feature), ''), 'unknown'), '.', 1), 100);
  v_provider text := left(coalesce(nullif(btrim(p_provider), ''), 'unknown'), 40);
  v_model text := left(coalesce(nullif(btrim(p_model), ''), 'unknown'), 160);
  v_prompt_version text := left(coalesce(nullif(btrim(p_prompt_version), ''), 'unknown-v1'), 80);
  v_pricing public.ai_pricing_registry%rowtype;
  v_policy public.ai_usage_policy_versions%rowtype;
  v_bucket public.ai_usage_buckets%rowtype;
  v_active_leases integer;
  v_recent_requests integer;
  v_actual_cost numeric := 0;
  v_reserved_cost numeric := 0;
  v_expected_cost numeric;
  v_projected_cost numeric;
  v_band text := 'normal';
  v_lease_id uuid;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_input_chars is null or p_input_chars < 0 or p_input_chars > 20000 then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'input_too_large', '{}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'input_too_large');
  end if;

  if p_estimated_input_tokens is null or p_estimated_input_tokens < 0 or p_estimated_input_tokens > 1000000
    or p_estimated_output_tokens is null or p_estimated_output_tokens < 0 or p_estimated_output_tokens > 1000000
    or p_estimated_cost_usd is null or p_estimated_cost_usd < 0 or p_estimated_cost_usd::text = 'NaN' then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'invalid_input', '{}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'invalid_input');
  end if;

  select * into v_pricing
  from public.ai_pricing_registry
  where provider = v_provider
    and model = v_model
    and approved
    and effective_from <= v_now
    and (effective_until is null or effective_until > v_now)
  order by effective_from desc
  limit 1;

  if not found then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'pricing_unavailable', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, '{}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'pricing_unavailable');
  end if;

  v_expected_cost := round((
    p_estimated_input_tokens::numeric * v_pricing.input_usd_per_million_tokens +
    p_estimated_output_tokens::numeric * v_pricing.output_usd_per_million_tokens
  ) / 1000000, 8);

  if round(p_estimated_cost_usd, 8) <> v_expected_cost then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'cost_mismatch', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, '{}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'cost_mismatch');
  end if;

  select * into v_policy
  from public.ai_usage_policy_versions
  where policy_key = 'default'
    and effective_from <= v_now
  order by effective_from desc
  limit 1;

  if not found then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'budget_unavailable', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, '{}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'budget_unavailable');
  end if;

  insert into public.ai_usage_buckets (user_id, window_started_at)
  values (v_actor_id, v_window_start)
  on conflict (user_id) do nothing;

  select * into v_bucket
  from public.ai_usage_buckets
  where user_id = v_actor_id
  for update;

  delete from public.ai_usage_leases
  where user_id = v_actor_id
    and expires_at <= v_now;

  select count(*) into v_active_leases
  from public.ai_usage_leases
  where user_id = v_actor_id;

  select count(*) into v_recent_requests
  from public.ai_usage_control_events
  where user_id = v_actor_id
    and event_type = 'reservation_allowed'
    and decision = 'allow'
    and created_at >= v_minute_start;

  select coalesce(sum(estimated_cost_usd), 0) into v_actual_cost
  from public.ai_usage_logs
  where user_id = v_actor_id
    and created_at >= v_window_start
    and pricing_status = 'finalized'
    and estimated_cost_usd is not null;

  select coalesce(sum(reserved_cost_usd), 0) into v_reserved_cost
  from public.ai_usage_leases
  where user_id = v_actor_id;

  if v_bucket.window_started_at < v_window_start then
    v_bucket.request_count := 0;
    v_bucket.input_chars := 0;
  end if;

  v_projected_cost := round(v_actual_cost + v_reserved_cost + p_estimated_cost_usd, 8);
  if v_projected_cost >= v_policy.hard_cap_usd_per_day then
    v_band := 'hard_cap';
  elsif v_projected_cost >= v_policy.budget_usd_per_day * v_policy.critical_ratio then
    v_band := 'critical';
  elsif v_projected_cost >= v_policy.budget_usd_per_day * v_policy.warning_ratio then
    v_band := 'warning';
  end if;

  if v_active_leases >= v_policy.concurrent_requests then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'concurrency_exceeded', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, jsonb_build_object('activeRequests', v_active_leases));
    return jsonb_build_object('allowed', false, 'reason', 'concurrency_exceeded');
  elsif v_recent_requests >= v_policy.requests_per_minute then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'rate_limit_exceeded', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, jsonb_build_object('requestsInMinute', v_recent_requests));
    return jsonb_build_object('allowed', false, 'reason', 'rate_limit_exceeded');
  elsif v_bucket.request_count >= v_policy.requests_per_day then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'quota_exceeded', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, jsonb_build_object('requestsInDay', v_bucket.request_count));
    return jsonb_build_object('allowed', false, 'reason', 'quota_exceeded');
  elsif v_band = 'hard_cap' then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'hard_cap_exceeded', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, jsonb_build_object('projectedCostUsd', v_projected_cost));
    return jsonb_build_object('allowed', false, 'reason', 'hard_cap_exceeded');
  elsif v_projected_cost > v_policy.budget_usd_per_day then
    insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
    values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_blocked', 'block', 'budget_exceeded', p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, jsonb_build_object('projectedCostUsd', v_projected_cost));
    return jsonb_build_object('allowed', false, 'reason', 'budget_exceeded');
  end if;

  update public.ai_usage_buckets
  set window_started_at = v_window_start,
      request_count = case when v_bucket.window_started_at < v_window_start then 1 else v_bucket.request_count + 1 end,
      input_chars = case when v_bucket.window_started_at < v_window_start then p_input_chars else v_bucket.input_chars + p_input_chars end,
      updated_at = v_now
  where user_id = v_actor_id;

  insert into public.ai_usage_leases (
    user_id,
    expires_at,
    feature,
    provider,
    model,
    prompt_version,
    reserved_cost_usd
  )
  values (
    v_actor_id,
    v_now + interval '60 seconds',
    v_feature,
    v_provider,
    v_model,
    v_prompt_version,
    p_estimated_cost_usd
  )
  returning id into v_lease_id;

  insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, input_tokens, output_tokens, metadata)
  values (v_actor_id, v_function_name, v_feature, v_provider, v_model, v_prompt_version, 'reservation_allowed', 'allow', v_band, p_estimated_cost_usd, p_estimated_input_tokens, p_estimated_output_tokens, jsonb_build_object('projectedCostUsd', v_projected_cost));

  return jsonb_build_object(
    'allowed', true,
    'leaseId', v_lease_id,
    'policyVersion', v_policy.policy_version,
    'pricingVersion', 'pricing-v1',
    'estimatedCostUsd', p_estimated_cost_usd,
    'budgetStatus', v_band
  );
end;
$$;

create or replace function public.consume_ai_usage(p_input_chars integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input_tokens integer;
  v_input_price numeric;
  v_output_price numeric;
  v_cost numeric;
begin
  select input_usd_per_million_tokens, output_usd_per_million_tokens
    into v_input_price, v_output_price
  from public.ai_pricing_registry
  where provider = 'open_ai'
    and model = 'gpt-4o-mini'
    and approved
    and effective_from <= now()
    and (effective_until is null or effective_until > now())
  order by effective_from desc
  limit 1;

  if v_input_price is null then
    return jsonb_build_object('allowed', false, 'reason', 'pricing_unavailable');
  end if;

  v_input_tokens := ceil(greatest(coalesce(p_input_chars, 0), 0) / 4.0);
  v_cost := round((
    v_input_tokens::numeric * v_input_price + 1000 * v_output_price
  ) / 1000000, 8);
  return public.reserve_ai_usage(
    'legacy',
    'open_ai',
    'gpt-4o-mini',
    'legacy-v1',
    p_input_chars,
    v_input_tokens,
    1000,
    v_cost
  );
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

  insert into public.ai_usage_control_events (user_id, function_name, feature, provider, model, prompt_version, event_type, decision, reason, estimated_cost_usd, metadata)
  values (
    v_actor_id,
    left(split_part(v_lease.feature, '.', 1), 100),
    v_lease.feature,
    v_lease.provider,
    v_lease.model,
    v_lease.prompt_version,
    'lease_released',
    'observe',
    'lease_released',
    v_lease.reserved_cost_usd,
    '{}'::jsonb
  );
  return true;
end;
$$;

revoke all on function public.reserve_ai_usage(text, text, text, text, integer, integer, integer, numeric) from public, anon;
grant execute on function public.reserve_ai_usage(text, text, text, text, integer, integer, integer, numeric) to authenticated;
revoke all on function public.consume_ai_usage(integer) from public, anon;
grant execute on function public.consume_ai_usage(integer) to authenticated;
revoke all on function public.release_ai_usage(uuid) from public, anon;
grant execute on function public.release_ai_usage(uuid) to authenticated;

create or replace view public.ai_usage_cost_summary as
select
  date_trunc('day', created_at at time zone 'UTC') at time zone 'UTC' as period_started_at,
  user_id,
  feature,
  provider,
  model,
  count(*)::integer as calls,
  count(*) filter (where status = 'failure')::integer as failures,
  count(*) filter (where pricing_status <> 'finalized')::integer as unpriced_calls,
  count(*) filter (where usage_source = 'input_estimate')::integer as estimated_calls,
  coalesce(sum(input_tokens), 0)::bigint as input_tokens,
  coalesce(sum(output_tokens), 0)::bigint as output_tokens,
  coalesce(sum(estimated_cost_usd) filter (where pricing_status = 'finalized'), 0)::numeric(18, 8) as estimated_cost_usd
from public.ai_usage_logs
group by 1, 2, 3, 4, 5;

revoke all on public.ai_pricing_registry from public, anon, authenticated, service_role;
grant select on public.ai_pricing_registry to service_role;
revoke all on public.ai_usage_policy_versions from public, anon, authenticated, service_role;
grant select on public.ai_usage_policy_versions to service_role;
revoke all on public.ai_usage_cost_summary from public, anon, authenticated, service_role;
grant select on public.ai_usage_cost_summary to service_role;
