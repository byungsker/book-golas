set role service_role;

do $$
declare
  result text;
  index integer;
begin
  for index in 1..5 loop
    result := public.register_waitlist_submission(
      'guard' || index || '@example.com',
      'ko',
      'fixture',
      repeat('a', 64)
    );
    if result <> 'success' then
      raise exception 'expected success for submission %, got %', index, result;
    end if;
  end loop;

  result := public.register_waitlist_submission(
    'guard6@example.com',
    'ko',
    'fixture',
    repeat('a', 64)
  );
  if result <> 'rate_limited' then
    raise exception 'expected rate_limited, got %', result;
  end if;

  result := public.register_waitlist_submission(
    'duplicate@example.com',
    'en',
    'fixture',
    repeat('b', 64)
  );
  if result <> 'success' then
    raise exception 'expected duplicate fixture seed success, got %', result;
  end if;

  result := public.register_waitlist_submission(
    'duplicate@example.com',
    'en',
    'fixture',
    repeat('c', 64)
  );
  if result <> 'duplicate' then
    raise exception 'expected duplicate, got %', result;
  end if;

  result := public.register_waitlist_submission(
    'not-an-email',
    'ko',
    'fixture',
    repeat('d', 64)
  );
  if result <> 'invalid' then
    raise exception 'expected invalid, got %', result;
  end if;
end;
$$;

reset role;

set role authenticated;

do $$
begin
  begin
    perform public.register_waitlist_submission(
      'blocked-authenticated@example.com',
      'ko',
      'fixture',
      repeat('6', 64)
    );
    raise exception 'authenticated role can execute waitlist registration';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform count(*) from public.waitlist_rate_limits;
    raise exception 'authenticated role can read waitlist rate limits';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;
set role postgres;
insert into public.waitlist_rate_limits (ip_hash, window_started_at, submission_count, updated_at)
values (repeat('f', 64), now() - interval '3 hours', 1, now() - interval '3 hours')
on conflict (ip_hash) do update set updated_at = excluded.updated_at;
set role service_role;
select public.cleanup_waitlist_rate_limits();
reset role;
do $$
begin
  if exists (
    select 1 from public.waitlist_rate_limits where ip_hash = repeat('f', 64)
  ) then
    raise exception 'stale rate bucket was not removed';
  end if;
end;
$$;

set role anon;

do $$
begin
  begin
    perform public.register_waitlist_submission(
      'blocked@example.com',
      'ko',
      'fixture',
      repeat('e', 64)
    );
    raise exception 'anonymous role can execute waitlist registration';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform count(*) from public.waitlist_rate_limits;
    raise exception 'anonymous role can read waitlist rate limits';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;
