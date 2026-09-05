# Bookgolas CLI

`bookgolas` is the CLI-first companion for the Bookgolas Agent API 0.1.0. It
is intentionally read-only and never imports a database client, Supabase SDK,
or provider credential.

## Install and run

```bash
cd cli
npm install
npm link
export BOOKGOLAS_API_URL=http://127.0.0.1:8787
export BOOKGOLAS_API_TOKEN="<Supabase user access token>"
bookgolas library --page 1 --page-size 20
```

The token is read only from `BOOKGOLAS_API_TOKEN`; do not put it in command
arguments, files committed to Git, or logs. `capabilities` does not require a
token. The API process must be started separately with the authenticated
Bookgolas Agent API configuration.

## Commands

| Command | Scope |
| --- | --- |
| `capabilities` | Discover the versioned manifest |
| `books search --query <text>` | Search the authenticated user's library |
| `library` | List the authenticated user's books |
| `progress [--book-id <id>]` | List the user's progress history |
| `recall [--book-id <id>]` | List stored Recall history |
| `insights` | List stored reading insights |

Pagination is explicit with `--page` and `--page-size`; the CLI never fetches
an unbounded collection. Every successful call writes one JSON response to
stdout. Diagnostics go to stderr.

## Exit codes

`0` success, `2` usage/configuration, `3` authentication, `4` forbidden or
write-disabled, `5` upstream failure, `6` timeout/cancellation, `7` rate
limited, and `8` unexpected failure. GET requests retry at most three total
attempts with bounded exponential backoff.

## AI monitoring local demo

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

Each event contains `schemaVersion`, `eventId`, `timestamp`, `provider`,
`model`, `feature`, `status`, `outcome`, `inputTokens`, `outputTokens`,
`totalTokens`, `latencyMs`, `ttftMs`, `costUsd`, `retryCount`, `errorType`,
`errorCode`, `traceId`, `correlationId`, `spanId`, and `pricingVersion`.
`status`, `totalTokens`, and `costUsd` are derived. The fixture uses pricing
version `2026-09-01`; `pricingVersion` pins the rate table that calculated the
operational `costUsd` estimate. It is not an invoice, quota decision, tax
record, or proof of provider billing. Unknown provider/model prices are
rejected rather than silently estimated.

Normalization is a redaction boundary: it emits only this schema and drops
raw prompt, response, generated output, user, authorization, credential,
API-key, access-token, and secret properties. The fixture is not a retention
system. A persistent replacement needs documented retention and deletion,
authorized administrator roles, auditability, and least-privilege access.
`createSafeEventSink` returns `{ accepted: false }` for validation or write
failures and never throws into its caller.

The local demo route checks `requireAdminUser`, uses `Cache-Control: no-store`,
and returns fixture data only in `development` on loopback hosts. It preserves
the authentication boundary; other hosts or environments receive an
unavailable response instead of demo data.

```bash
npm run demo:check
cd cli && npm test
cd ../ai-monitor && npm test
rg -n -i 'prompt|response|authorization|credential|api[_-]?key|access[_-]?token|secret' \
  docs/guides/ai-monitoring-1.1.0.md scripts/ai-monitor-demo-check.mjs
```
