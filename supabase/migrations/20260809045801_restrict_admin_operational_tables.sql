create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null check (action in ('waitlist.delete', 'push_template.update')),
  resource_type text not null check (
    (action = 'waitlist.delete' and resource_type = 'waitlist')
    or (action = 'push_template.update' and resource_type = 'push_template')
  ),
  resource_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object' and length(metadata::text) <= 2048
  ),
  created_at timestamptz not null default now()
);

alter table public.admin_audit_events enable row level security;
revoke all on table public.admin_audit_events from public, anon, authenticated, service_role;
create index if not exists admin_audit_events_created_at_idx on public.admin_audit_events (created_at);
grant select on table public.push_templates, public.push_announcements to service_role;

create or replace function public.prevent_admin_audit_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'admin audit events are append-only';
  end if;
  if old.created_at >= pg_catalog.now() - pg_catalog.make_interval(years => 2) then
    raise exception 'admin audit events are append-only';
  end if;
  return old;
end;
$$;

revoke all on function public.prevent_admin_audit_event_mutation() from public, anon, authenticated, service_role;

drop trigger if exists admin_audit_events_append_only on public.admin_audit_events;
create trigger admin_audit_events_append_only
before update or delete on public.admin_audit_events
for each row execute function public.prevent_admin_audit_event_mutation();

create or replace function public.cleanup_admin_audit_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  -- safe-delete
  delete from public.admin_audit_events
   where created_at < pg_catalog.now() - pg_catalog.make_interval(years => 2);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_admin_audit_events() from public, anon, authenticated;
grant execute on function public.cleanup_admin_audit_events() to service_role;

create or replace function public.admin_update_push_template(
  p_actor_id uuid,
  p_template_id uuid,
  p_changes jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_id uuid;
begin
  if p_changes is null or pg_catalog.jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'invalid template changes';
  end if;
  if not exists (select 1 from auth.users where id = p_actor_id) then
    raise exception 'invalid audit actor';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_object_keys(p_changes) as field_name
    where field_name not in ('name', 'title', 'body_template', 'title_en', 'body_template_en', 'is_active', 'priority')
  ) then
    raise exception 'unknown template field';
  end if;
  if p_changes ? 'name' and (pg_catalog.jsonb_typeof(p_changes->'name') not in ('string', 'null') or pg_catalog.length(p_changes->>'name') > 120) then
    raise exception 'invalid template name';
  end if;
  if p_changes ? 'title' and (pg_catalog.jsonb_typeof(p_changes->'title') <> 'string' or pg_catalog.length(p_changes->>'title') > 120) then
    raise exception 'invalid template title';
  end if;
  if p_changes ? 'body_template' and (pg_catalog.jsonb_typeof(p_changes->'body_template') <> 'string' or pg_catalog.length(p_changes->>'body_template') > 1000) then
    raise exception 'invalid template body';
  end if;
  if p_changes ? 'title_en' and (pg_catalog.jsonb_typeof(p_changes->'title_en') not in ('string', 'null') or pg_catalog.length(p_changes->>'title_en') > 120) then
    raise exception 'invalid English title';
  end if;
  if p_changes ? 'body_template_en' and (pg_catalog.jsonb_typeof(p_changes->'body_template_en') not in ('string', 'null') or pg_catalog.length(p_changes->>'body_template_en') > 1000) then
    raise exception 'invalid English body';
  end if;
  if p_changes ? 'is_active' and pg_catalog.jsonb_typeof(p_changes->'is_active') <> 'boolean' then
    raise exception 'invalid active state';
  end if;
  if p_changes ? 'priority' and (pg_catalog.jsonb_typeof(p_changes->'priority') <> 'number' or (p_changes->>'priority')::integer < 0 or (p_changes->>'priority')::integer > 10000) then
    raise exception 'invalid priority';
  end if;

  update public.push_templates
     set name = case when p_changes ? 'name' then p_changes->>'name' else name end,
         title = case when p_changes ? 'title' then p_changes->>'title' else title end,
         body_template = case when p_changes ? 'body_template' then p_changes->>'body_template' else body_template end,
         title_en = case when p_changes ? 'title_en' then p_changes->>'title_en' else title_en end,
         body_template_en = case when p_changes ? 'body_template_en' then p_changes->>'body_template_en' else body_template_en end,
         is_active = case when p_changes ? 'is_active' then (p_changes->>'is_active')::boolean else is_active end,
         priority = case when p_changes ? 'priority' then (p_changes->>'priority')::integer else priority end,
         updated_at = pg_catalog.now()
   where id = p_template_id
   returning id into changed_id;

  if changed_id is null then
    return null;
  end if;

  insert into public.admin_audit_events (actor_id, action, resource_type, resource_id, metadata)
  values (
    p_actor_id,
    'push_template.update',
    'push_template',
    changed_id,
    pg_catalog.jsonb_build_object('fields', (select pg_catalog.jsonb_agg(field_name order by field_name) from pg_catalog.jsonb_object_keys(p_changes) as field_name))
  );
  return changed_id;
end;
$$;

revoke all on function public.admin_update_push_template(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_push_template(uuid, uuid, jsonb) to service_role;

create or replace function public.admin_delete_waitlist_entry(
  p_actor_id uuid,
  p_entry_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  if not exists (select 1 from auth.users where id = p_actor_id) then
    raise exception 'invalid audit actor';
  end if;
  delete from public.waitlist
   where id = p_entry_id
   returning id into deleted_id;
  if deleted_id is null then
    return null;
  end if;
  insert into public.admin_audit_events (actor_id, action, resource_type, resource_id, metadata)
  values (p_actor_id, 'waitlist.delete', 'waitlist', deleted_id, '{"reason":"admin_requested"}'::jsonb);
  return deleted_id;
end;
$$;

revoke all on function public.admin_delete_waitlist_entry(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_waitlist_entry(uuid, uuid) to service_role;
