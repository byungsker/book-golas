reset role;

do $$
begin
  if has_table_privilege('authenticated', 'public.admin_audit_events', 'SELECT') then
    raise exception 'authenticated role can read admin audit events';
  end if;
  if has_table_privilege('anon', 'public.admin_audit_events', 'SELECT') then
    raise exception 'anonymous role can read admin audit events';
  end if;
  if not has_table_privilege('service_role', 'public.admin_audit_events', 'INSERT') then
    raise exception 'service_role cannot write admin audit events';
  end if;
end;
$$;

set role authenticated;

do $$
begin
  if has_table_privilege(current_user, 'public.push_templates', 'SELECT') then
    raise exception 'authenticated role can read push templates';
  end if;
  if has_table_privilege(current_user, 'public.push_announcements', 'SELECT') then
    raise exception 'authenticated role can read push announcements';
  end if;
end;
$$;

reset role;
set role anon;

do $$
begin
  if has_table_privilege(current_user, 'public.push_templates', 'SELECT') then
    raise exception 'anonymous role can read push templates';
  end if;
  if has_table_privilege(current_user, 'public.push_announcements', 'SELECT') then
    raise exception 'anonymous role can read push announcements';
  end if;
end;
$$;

reset role;
