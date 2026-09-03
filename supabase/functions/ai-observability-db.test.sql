begin;

select set_config('request.jwt.claim.role', 'service_role', true);

DO $$
declare
  required_column text;
  required_columns text[] := array[
    'event_version',
    'request_id',
    'call_id',
    'outcome'
  ];
begin
  foreach required_column in array required_columns loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ai_usage_logs'
        and column_name = required_column
    ) then
      raise exception 'ai_usage_logs missing column: %', required_column;
    end if;
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ai_usage_control_events'
        and column_name = required_column
    ) then
      raise exception 'ai_usage_control_events missing column: %', required_column;
    end if;
  end loop;

  if not has_function_privilege(
    'service_role',
    'public.get_ai_observability_health(integer)',
    'execute'
  ) then
    raise exception 'service_role cannot execute health RPC';
  end if;

  if has_table_privilege('anon', 'public.ai_usage_logs', 'select') then
    raise exception 'anon can read ai_usage_logs';
  end if;

  if has_table_privilege('authenticated', 'public.ai_usage_control_events', 'select') then
    raise exception 'authenticated can read ai_usage_control_events';
  end if;
end;
$$;

DO $$
declare
  health jsonb;
begin
  health := public.get_ai_observability_health(24);
  if health ? 'user_id' or health ? 'prompt' or health ? 'response' then
    raise exception 'health projection contains private payload fields';
  end if;
  if not (health ? 'status') or not (health ? 'coveragePercent') then
    raise exception 'health projection is missing required aggregate fields';
  end if;
end;
$$;

rollback;
