# Error Observability Strategy — 1.1.0

## Decision and boundary

BOK-421 adopts a provider-neutral structured event contract first. The
provider decision is split by surface: Firebase Crashlytics is the mobile
candidate for Flutter fatal and non-fatal signals, while Sentry is the server
candidate for Next.js and Supabase Edge Functions. Neither SDK, provider
account, secret, external alert, or production configuration is activated by
this issue.

The implemented evidence is the server boundary: Web admin API failures call
`web/src/lib/error-reporting.ts`, and the shared Edge wrapper emits the same
request correlation fields. Runtime collection remains the responsibility of
the approved Vercel/Supabase log sink until a provider is separately approved.

## Event contract

Web API error events contain only `eventVersion`, `event`, `surface`,
`severity`, `sampled`, `sampleRate`, `requestId`, a fixed route, a bounded
`errorCode`, and HTTP status. The response exposes the same `requestId` in
`x-request-id` without changing the public error body.

Edge events contain `eventVersion`, `event`, `surface`, `severity`, `sampled`,
`functionName`, `requestId`, `status`, bounded `latencyMs`, and `errorCode`.
`x-request-id` is accepted only when it matches the bounded identifier policy;
otherwise a new ID is generated and returned.

## Surface scope

| Surface | Fatal scope | Non-fatal scope | Current action |
| --- | --- | --- | --- |
| Flutter | Uncaught `FlutterError`, `PlatformDispatcher.onError`, and isolate failures | Bounded network/provider failures with an error code; exclude expected auth, validation, cancellation, and user content | Define Crashlytics boundary; implementation belongs to the mobile delivery unit, not this operations allowlist |
| Next.js admin | Server route exceptions and failed service queries | Approved admin API failures and future admin error-boundary digests | API routes use `captureWebError`; the client boundary must send only a bounded digest and route metadata |
| Supabase Edge Functions | Unhandled handler failures and HTTP 5xx responses | Bounded 4xx/error codes and provider outcome failures | `_shared/edge-http.ts` emits the structured event for wrapped functions |

## Masking and sampling

Logs must never contain exception messages or stacks, request or response
bodies, prompts, book content, email addresses, user IDs, authorization or
session headers, FCM tokens, provider payloads, API keys, or database error
objects. Only fixed routes, bounded identifiers, status, latency, and
allowlisted error codes may be persisted.

The source baseline retains 100% of error events (`sampleRate: 1`). Expected
4xx and successful informational traffic may move to a 10% collector-side
sample only after an approved volume and alert review; 5xx and explicit error
events remain at 100%. Sampling is not an authorization to add an external
sink or alert integration.

## Verification

```bash
cd web
npm run test:error-reporting
npm run lint
npm run build

cd ..
deno test --allow-read supabase/functions/_shared/edge-http.test.ts
deno check --config supabase/functions/deno.json supabase/functions/log-push-click/index.ts
```

These checks prove source-level event construction, masking boundaries,
request-ID propagation, and wrapper behavior. They do not prove a hosted log
sink, provider dashboard, secret, alert, deployment, or production runtime.
