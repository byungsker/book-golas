# AI Usage Dashboard — 1.1.0

## Scope

BOK-419 adds `/admin/ai-usage` and its authenticated
`/api/admin/ai-usage` summary route. The first version is an operational
dashboard for the `public.ai_usage_logs` contract; it is intended to surface
cost, failure, and latency signals rather than provide a billing report. The
route is currently deny-by-default because no administrator allowlist is
configured.

## Query contract

- The route requires `requireAdminUser()` before creating the service-role
  client.
- The server selects only `function_name`, `latency_ms`, `status`,
  `estimated_cost_usd`, and `created_at`.
- The default range is the latest seven UTC dates; callers may request up to
  31 dates and filter by function name.
- The result contains total, function-level, and daily call counts, failures,
  failure rates, average latency, and estimated cost. Individual log rows are
  never returned.
- The query is bounded to 10,000 rows and reports when that bound is reached.

## Privacy and estimate limits

The browser calls the server route and never queries Supabase directly. The
dashboard response does not contain user IDs, prompts, book data, embeddings,
provider response bodies, or generated output.

Cost is the sum of `estimated_cost_usd` values recorded by the AI function.
Missing token or model-price inputs may be absent from that sum. The displayed
amount is an operational estimate, not an invoice, quota, accounting record,
or proof of provider billing.

## Verification

```bash
cd web
npm run test:ai-usage-dashboard
npm run lint
npm run build
```

These checks use repository fixtures and a local Next.js build. They do not
connect to Supabase, deploy the dashboard, or validate hosted production data.
