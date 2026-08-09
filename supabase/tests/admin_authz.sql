reset role;

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
