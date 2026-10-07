reset role;

do $$
begin
  if has_table_privilege('anon', 'public.push_templates', 'SELECT')
     or has_table_privilege('authenticated', 'public.push_templates', 'SELECT')
     or has_table_privilege('anon', 'public.push_announcements', 'SELECT')
     or has_table_privilege('authenticated', 'public.push_announcements', 'SELECT') then
    raise exception 'untrusted role can read admin operational tables';
  end if;
  if not has_table_privilege('service_role', 'public.push_templates', 'SELECT')
     or not has_table_privilege('service_role', 'public.push_announcements', 'SELECT') then
    raise exception 'service_role lost admin operational read access';
  end if;
end;
$$;
