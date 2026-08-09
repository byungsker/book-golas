reset role;

do $$
begin
  if has_table_privilege('authenticated', 'public.admin_audit_events', 'SELECT') then
    raise exception 'authenticated role can read admin audit events';
  end if;
  if has_table_privilege('anon', 'public.admin_audit_events', 'SELECT') then
    raise exception 'anonymous role can read admin audit events';
  end if;
  if has_table_privilege('service_role', 'public.admin_audit_events', 'SELECT')
     or has_table_privilege('service_role', 'public.admin_audit_events', 'INSERT')
     or has_table_privilege('service_role', 'public.admin_audit_events', 'UPDATE')
     or has_table_privilege('service_role', 'public.admin_audit_events', 'DELETE') then
    raise exception 'service_role can mutate audit table directly';
  end if;
  if not has_function_privilege('service_role', 'public.admin_update_push_template(uuid,uuid,jsonb)', 'EXECUTE') then
    raise exception 'service_role cannot execute template audit RPC';
  end if;
  if not has_function_privilege('service_role', 'public.admin_delete_waitlist_entry(uuid,uuid)', 'EXECUTE') then
    raise exception 'service_role cannot execute waitlist audit RPC';
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
