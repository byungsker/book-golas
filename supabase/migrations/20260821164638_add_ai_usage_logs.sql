create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  function_name text not null check (btrim(function_name) <> '' and length(function_name) <= 100),
  model text not null check (btrim(model) <> '' and length(model) <= 160),
  prompt_version text not null check (btrim(prompt_version) <> '' and length(prompt_version) <= 80),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost_usd numeric(12, 8) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  latency_ms integer not null check (latency_ms >= 0),
  status text not null check (status in ('success', 'failure')),
  error_code text check (error_code is null or (btrim(error_code) <> '' and length(error_code) <= 120)),
  created_at timestamptz not null default now()
);

alter table public.ai_usage_logs enable row level security;
revoke all on table public.ai_usage_logs from public, anon, authenticated, service_role;
grant select, insert on table public.ai_usage_logs to service_role;

create index if not exists ai_usage_logs_function_created_idx
  on public.ai_usage_logs (function_name, created_at desc);
create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);
