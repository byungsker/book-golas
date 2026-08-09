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
  if has_function_privilege('authenticated', 'public.admin_update_push_template(uuid,uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.admin_delete_waitlist_entry(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.admin_update_push_template(uuid,uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.admin_delete_waitlist_entry(uuid,uuid)', 'EXECUTE') then
    raise exception 'untrusted role can execute admin mutation RPC';
  end if;
end;
$$;

do $$
declare
  fresh_id uuid;
  stale_id uuid;
begin
  insert into public.admin_audit_events (action, resource_type, resource_id, metadata)
  values ('waitlist.delete', 'waitlist', gen_random_uuid(), '{}'::jsonb)
  returning id into fresh_id;
  begin
    update public.admin_audit_events set metadata = '{"blocked":true}'::jsonb where id = fresh_id;
    raise exception 'audit update unexpectedly succeeded';
  exception when others then
    null;
  end;
  begin
    delete from public.admin_audit_events where id = fresh_id;
    raise exception 'fresh audit delete unexpectedly succeeded';
  exception when others then
    null;
  end;
  insert into public.admin_audit_events (action, resource_type, resource_id, metadata, created_at)
  values ('waitlist.delete', 'waitlist', gen_random_uuid(), '{}'::jsonb, now() - interval '3 years')
  returning id into stale_id;
  set role service_role;
  perform public.cleanup_admin_audit_events();
  reset role;
  if exists (select 1 from public.admin_audit_events where id = stale_id) then
    raise exception 'stale audit event was not cleaned up';
  end if;
end;
$$;
reset role;
