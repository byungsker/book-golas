revoke select on table public.push_templates from anon, authenticated;
revoke select on table public.push_announcements from anon, authenticated;
grant select on table public.push_templates, public.push_announcements to service_role;
