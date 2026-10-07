alter table public.push_logs
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists delivery_status text not null default 'sent'
    check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  add column if not exists failure_code text
    check (failure_code is null or (btrim(failure_code) <> '' and length(failure_code) <= 80)),
  add column if not exists invalid_token boolean not null default false,
  add column if not exists dedupe_status text not null default 'not_applicable'
    check (dedupe_status in ('not_applicable', 'reserved', 'sent', 'failed', 'skipped'));

create index if not exists idx_push_logs_created_status
  on public.push_logs (created_at desc, delivery_status);

create index if not exists idx_push_logs_type_created
  on public.push_logs (push_type, created_at desc);
