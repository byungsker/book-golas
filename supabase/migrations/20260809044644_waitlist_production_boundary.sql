revoke all on table public.waitlist from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'bookgolas-waitlist-rate-limit-cleanup',
      '*/15 * * * *',
      'select public.cleanup_waitlist_rate_limits()'
    );
  end if;
exception
  when unique_violation then
    null;
end;
$$;
