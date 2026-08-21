# AI Usage Logging — 1.1.0

## Scope

`public.ai_usage_logs` records operational metrics for server-side AI calls.
BOK-417 applies the contract to `supabase/functions/generate-embedding/` as the
first verified surface. The log is an observability record, not an invoice or a
user-facing usage quota.

## Stored fields

| Field | Purpose |
| --- | --- |
| `user_id` | Authenticated account scope; nullable so aggregate history can survive account deletion. |
| `function_name`, `model`, `prompt_version` | Stable routing and contract dimensions. |
| `input_tokens`, `output_tokens`, `total_tokens` | Provider-reported counts when available. |
| `estimated_cost_usd` | Input-token estimate for the configured model price. |
| `latency_ms`, `status`, `error_code`, `created_at` | Operational outcome and timing. |

The embedding function stores success and failure rows, measures the provider
request latency, and records a bounded error code. A log insert failure fails
the request so an AI call is not silently treated as measured.

## Privacy and access boundary

The table has no columns for prompts, input text, book identifiers, page
numbers, embeddings, provider response bodies, or generated output. Error
responses are not copied into `error_code`. RLS is enabled and direct
`public`, `anon`, and `authenticated` table privileges are revoked. Only the
server-side `service_role` path can insert or query rows.

The BOK-419 `/api/admin/ai-usage` route is the allowlisted aggregate projection
for the first dashboard. It queries only operational columns from an
authenticated server route and never exposes the table directly to clients.
Retention and aggregate export policy must be approved before production use.

## Query candidate

The `/api/admin/ai-usage` server route uses a bounded query that selects only
`function_name`, `status`, estimated cost, latency, and `created_at`, with
time-range and function filters. It returns daily and function-level totals,
failure rates, and latency without returning individual prompts, embeddings,
or reading records. BOK-419 owns the dashboard and aggregate implementation.

## Cost estimate

`generate-embedding` uses `text-embedding-3-small`, `embedding-v1`, and an
input rate of $0.02 per one million tokens according to the [official model
page](https://developers.openai.com/api/docs/models/text-embedding-3-small).
The value is an estimate and must be refreshed before financial reporting.

## Verification

```bash
deno test --allow-read supabase/functions/generate-embedding/usage-log.test.ts
deno check --config supabase/functions/deno.json supabase/functions/generate-embedding/index.ts
```

Schema application remains governed by the migration and CI schema-validation
workflow. No live provider, Supabase project, credential, or production data
was used for this change.
