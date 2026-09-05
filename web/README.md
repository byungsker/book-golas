This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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
