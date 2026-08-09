create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('waitlist.delete', 'push_template.update')),
  resource_type text not null,
  resource_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_events enable row level security;
revoke all on table public.admin_audit_events from public, anon, authenticated;
grant all on table public.admin_audit_events to service_role;

revoke all on table public.push_templates from anon, authenticated;
revoke all on table public.push_announcements from anon, authenticated;
