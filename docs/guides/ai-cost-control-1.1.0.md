# AI Cost Control — 1.1.0

## Scope

BOK-428 adds a provider-neutral control boundary for every server-side OpenAI
call. The boundary estimates a reservation before the provider request,
records the outcome after the request, and never treats an estimate as an
invoice or payment record.

## Approved registry

`ai_pricing_registry` is append-only. Each row contains provider, model,
currency, input/output price per million tokens, approval reference, and an
effective interval. A new price is a new row; historical rows are not edited.
The initial snapshot covers `gpt-4o-mini` at `$0.15/$0.60` input/output and
`text-embedding-3-small` at `$0.02` input. Confirm the official model pages
before adding a later effective row:

- <https://developers.openai.com/api/docs/models/gpt-4o-mini>
- <https://developers.openai.com/api/docs/models/text-embedding-3-small>

## Control contract

`reserve_ai_usage` locks the authenticated user's bucket, expires stale
leases, checks the approved price, and evaluates the current policy:

| Control | Default |
| --- | ---: |
| Requests / minute | 10 |
| Requests / UTC day | 30 |
| Concurrent leases | 3 |
| Warning / critical | 80% / 90% of daily budget |
| Daily budget / hard cap | `$0.05` / `$0.10` |

Quota, rate, budget, and hard-cap blocks are written to
`ai_usage_control_events` before returning a safe error. Provider failures,
missing pricing, and anomalous or inconsistent token data are separate from
`finalized` cost rows. `usage_source=input_estimate` identifies the bounded
input-length estimate used by a LangChain embedding path.

## Dashboard and dry run

The authenticated `/admin/ai-usage` page shows finalized and unpriced calls,
feature·model dimensions, policy thresholds, and control-event counts without
returning user IDs, prompts, reading data, or provider payloads.

```bash
deno test --allow-read supabase/functions/_shared/ai-cost-control.test.ts supabase/functions/_shared/ai-usage-contract.test.ts supabase/functions/ai-cost-control-contract.test.ts
deno test --config supabase/functions/deno.json --allow-read supabase/functions/_shared/ai-usage.test.ts
cd web && npm run test:ai-usage-dashboard
```

These checks are deterministic and do not call a provider or mutate hosted
data. A blocked production promotion requires rollback or an explicit owner
exception; changing a secret, price row, payment setting, or production
policy is outside this PR.
