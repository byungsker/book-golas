# AI Monitoring — 1.1.0

## Shared local data contract

The reproducible monitor uses `ai-monitor/fixtures/events.json` as its only
demo input and `ai-monitor/src/core.mjs` as the single normalization,
filtering, aggregation, pricing, and fail-safe sink implementation. The CLI
and the local web report both consume those paths. The local read API is
`GET /api/admin/ai-monitor`; it projects the same normalized fixture data and
does not connect to a provider, database, or production service.

Start the local checks from the repository root:

```bash
npm run demo:check
node cli/bin/ai-monitor.mjs summary --format json
node cli/bin/ai-monitor.mjs usage --format json
```

To view the web page locally, start Next.js and use a loopback URL:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000/admin/ai-monitor` with an authenticated local
administrator session. A direct API request still requires authentication.

## CLI contract

`node cli/bin/ai-monitor.mjs` has four commands: `summary`, `usage`,
`errors`, and `costs`. Every command accepts `--format json|csv` and these
exact-match or UTC-date filters: `--from YYYY-MM-DD`, `--to YYYY-MM-DD`,
`--provider`, `--model`, `--status`, `--outcome`, and `--error-type`.
`--from` is inclusive and `--to` is inclusive at the CLI boundary. `errors`
also accepts `--since <positive-hours>h`; `costs` also accepts
`--group-by provider|model|feature`.

`summary` returns aggregate totals, daily/provider/model groups, recent
failures, traces, and pricing versions. `usage` returns normalized event rows.
`errors` returns failure rows only. `costs` returns grouped aggregate cost
rows. An invalid option, invalid date, unsupported value, or empty result
writes a concise diagnostic to stderr and exits nonzero.

## Normalized event schema

Each accepted event has these fields:

| Fields | Meaning |
| --- | --- |
| `schemaVersion`, `eventId`, `timestamp` | Schema identity, event identity, and ISO UTC event time. |
| `provider`, `model`, `feature` | Provider, model, and stable workload dimension. |
| `status`, `outcome` | Derived status and provider outcome. |
| `inputTokens`, `outputTokens`, `totalTokens` | Non-negative token counts; total is derived. |
| `latencyMs`, `ttftMs`, `retryCount` | Non-negative latency, time-to-first-token, and retry metrics. |
| `costUsd`, `pricingVersion` | Derived USD estimate and the catalog version that produced it. |
| `errorType`, `errorCode` | Failure classification; `null` for success. |
| `traceId`, `correlationId`, `spanId` | Correlation identifiers for safe operational joins. |

## Pricing and estimate semantics

The fixture normalizes through pricing catalog version `2026-09-01`. The
stored `pricingVersion` pins the rate table used for each `costUsd` value, so
historical reports remain interpretable after a catalog update. `costUsd` is
calculated from input and output tokens at that version's per-million-token
rates. It is an operational estimate, not an invoice, quota decision, tax
record, or proof of provider billing. A provider/model without a rate in the
selected version is rejected rather than silently estimated.

## Privacy, retention, and availability

Normalization is a redaction boundary: it emits only the listed schema fields
and drops raw prompt, response, generated output, user, authorization,
credential, API-key, access-token, and secret properties. Do not add those
fields to the fixture, CLI output, route response, logs, or error text.

The fixture is local demo data, not a retention system. Before replacing it
with persisted data, define a documented retention period, deletion process,
authorized administrator roles, audit trail, and least-privilege read path.
The current route checks `requireAdminUser` before loading data, uses
`Cache-Control: no-store`, and is intended only for local development.

`createSafeEventSink` is fail-safe: both validation and writer failures return
`{ accepted: false }` and never throw into its caller. The caller can continue
serving work while recording that monitoring was not accepted; it must not
treat an unsuccessful sink write as proof that data was retained.

The local demo boundary is deliberate. `/api/admin/ai-monitor` returns fixture
data only after authentication, only when `NODE_ENV` is `development`, and
only for a loopback host (`localhost`, `127.0.0.1`, or `::1`). Other hosts or
environments receive an unavailable response instead of demo data.

## Verification

```bash
npm run demo:check
cd cli && npm test
cd ../ai-monitor && npm test
rg -n -i 'prompt|response|authorization|credential|api[_-]?key|access[_-]?token|secret' \
  docs/guides/ai-monitoring-1.1.0.md scripts/ai-monitor-demo-check.mjs
```

These commands use Node built-ins and repository fixtures. They do not deploy,
contact production services, or require provider credentials.
