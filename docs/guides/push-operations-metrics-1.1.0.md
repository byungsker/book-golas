# Push Operations Metrics — 1.1.0

## Scope and boundary

BOK-420 extends the existing `push_logs` contract and `/admin/push-logs`
screen with a bounded seven-day UTC operations summary. It records source-level
evidence for delivery health and does not authorize production dispatch,
external alerting, or provider changes.

## Stored outcome fields

| Field | Meaning |
| --- | --- |
| `created_at` | Attempt or outcome record time used for aggregation. |
| `delivery_status` | `pending`, `sent`, `failed`, or `skipped`. |
| `failure_code` | Bounded safe category such as `invalid_token` or `provider_unavailable`; raw FCM responses are not stored. |
| `invalid_token` | Whether the failure is eligible for token cleanup. |
| `dedupe_status` | `not_applicable`, `reserved`, `sent`, `failed`, or `skipped`. |

The batch nudge function keeps a failed dedupe reservation as a failed log,
records non-deduped failures as outcome rows, and records unique-key collision
skips as `duplicate_dedupe_key`. `UNREGISTERED` and
`registration-token-not-registered` are cleanup signals. `INVALID_ARGUMENT` is
reported as a provider payload error and is not treated as proof of an invalid
token.

## Metric definitions

- Success and failure rates use `sent + failed` as the delivery-attempt
  denominator; dedupe skips and pending reservations are shown separately.
- Invalid-token count is the number of outcome rows marked `invalid_token`.
- CTR is clicked successful rows divided by successful rows.
- Dedupe hits are persisted rows with `dedupe_status=skipped` or
  `failure_code=duplicate_dedupe_key`.
- The API selects only aggregate fields, limits the window to seven UTC dates
  and 10,000 rows, and never returns raw push body data in the summary.

## Alert candidate boundary

Future Discord or Slack notifications may use sustained failure-rate,
invalid-token, or provider-unavailable thresholds. This issue documents those
candidate signals only. A separate owner-approved threshold, destination,
secret, quiet-hour, retry, and rollback contract is required before any
outbound alert is enabled.

## Verification

```bash
deno test --allow-read supabase/functions/send-batch-nudge/delivery-metrics.test.ts
deno check --config supabase/functions/deno.json supabase/functions/send-batch-nudge/index.ts
cd web && npm run test:push-ops && npm run lint && npm run build
```

No live Supabase project, FCM provider, secret, or external notification
channel was used.
