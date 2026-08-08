create table if not exists public.waitlist_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0 check (submission_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.waitlist_rate_limits enable row level security;

revoke all on table public.waitlist_rate_limits from public, anon, authenticated;

create index if not exists waitlist_rate_limits_updated_at_idx
  on public.waitlist_rate_limits (updated_at);

create or replace function public.cleanup_waitlist_rate_limits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  -- safe-delete
  delete from public.waitlist_rate_limits
   where updated_at < pg_catalog.now() - pg_catalog.make_interval(hours => 2);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_waitlist_rate_limits() from public, anon, authenticated;
grant execute on function public.cleanup_waitlist_rate_limits() to service_role;

create or replace function public.register_waitlist_submission(
  p_email text,
  p_locale text default 'ko',
  p_source text default 'landing',
  p_ip_hash text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  normalized_locale text := case when p_locale = 'en' then 'en' else 'ko' end;
  normalized_source text := pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.left(pg_catalog.btrim(p_source), 80), ''), 'landing');
  current_window timestamptz;
  current_count integer;
begin
  if normalized_email is null
    or pg_catalog.length(normalized_email) > 254
    or normalized_email !~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
    or p_ip_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$'
  then
    return 'invalid';
  end if;

  perform public.cleanup_waitlist_rate_limits();

  insert into public.waitlist_rate_limits (ip_hash, window_started_at, submission_count, updated_at)
  values (p_ip_hash, pg_catalog.now(), 0, pg_catalog.now())
  on conflict (ip_hash) do nothing;

  select window_started_at, submission_count
    into current_window, current_count
    from public.waitlist_rate_limits
   where ip_hash = p_ip_hash
   for update;

  if current_window < pg_catalog.now() - pg_catalog.make_interval(hours => 1) then
    current_window := pg_catalog.now();
    current_count := 0;
  end if;

  if current_count >= 5 then
    update public.waitlist_rate_limits
       set window_started_at = current_window, updated_at = pg_catalog.now()
     where ip_hash = p_ip_hash;
    return 'rate_limited';
  end if;

  update public.waitlist_rate_limits
     set window_started_at = current_window,
         submission_count = current_count + 1,
         updated_at = pg_catalog.now()
   where ip_hash = p_ip_hash;

  begin
    insert into public.waitlist (email, locale, source)
    values (normalized_email, normalized_locale, normalized_source);
  exception
    when unique_violation then
      return 'duplicate';
  end;

  return 'success';
end;
$$;

revoke all on function public.register_waitlist_submission(text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_waitlist_submission(text, text, text, text) to service_role;
