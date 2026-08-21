# Admin API and Edge Function Authorization — 1.1.0

## Scope and evidence boundary

This guide records the authorization contract for the `operations` delivery
unit at version `1.1.0`. It is source-level evidence for the BOK-416 security
boundary; it does not authorize deployment, secret rotation, provider changes,
or a claim that hosted runtime configuration has been verified.

## Admin API contract

`web/src/proxy.ts` protects the `/admin` UI, but its matcher excludes `/api`.
Every privileged API handler therefore performs its own `requireAdminUser()`
check before using a service-role client or forwarding a service-role request.
The current identity source is the server-side email allowlist in
`web/src/lib/admin-auth.ts`; the `users.role` column is not a substitute for
this API guard.

| Route | Methods | Protected operation |
| --- | --- | --- |
| `/api/admin/announcements` | GET | Read recent announcements with service role |
| `/api/admin/fcm-tokens` | GET | Read token counts and user email projection |
| `/api/admin/push-logs` | GET | Read dashboard or paginated push logs |
| `/api/admin/push-templates` | GET, PATCH | Read templates; update through audited RPC with actor ID |
| `/api/admin/send-bulk-push` | POST | Read tokens, write announcement/log records, invoke FCM |
| `/api/admin/send-test-push` | POST | Invoke FCM for a selected user |
| `/api/admin/users` | GET, PATCH | Read users or update a user role |
| `/api/admin/waitlist` | GET, DELETE | Read entries; delete through audited RPC with actor ID |

Unauthenticated or non-allowlisted requests must receive `401` from the route.
The source contract test covers every handler, including both methods on the
multi-method routes.

## Edge Function direct-call contract

All functions currently expose `Access-Control-Allow-Origin: *`. CORS is not
authorization: the function must still validate its credential before any
service-role operation.

| Function | Credential | Ownership or privilege boundary |
| --- | --- | --- |
| `delete-user` | User JWT | Deletes only the authenticated user's records and account |
| `export-reading-data` | User JWT | `userId` and email must match the authenticated user |
| `extract-keywords` | User JWT | Reads embeddings scoped to `user.id` |
| `generate-book-review` | User JWT | Reads the requested book and memos scoped to `user.id` |
| `generate-embedding` | User JWT | Requires `userId === user.id` before upsert |
| `log-push-click` | User JWT | Updates push logs scoped to `user.id` |
| `reading-insights` | User JWT | Requires `userId === user.id` |
| `recall-search` | User JWT | RPC search uses `filter_user_id: user.id` |
| `recommend-next-books` | User JWT | Requires `userId === user.id` before persistence |
| `structure-notes` | User JWT | Reads and writes structures scoped to `user.id` |
| `send-fcm-push` | Service role or User JWT | Service role may target a token; user mode may target only its own `userId` and cannot pass a raw token |
| `send-batch-nudge` | Service role only | Scheduled batch operation rejects non-service credentials |
| `send-test-push` | Service role only | Internal/admin server call only; rejects non-service credentials |
| `revenuecat-webhook` | RevenueCat bearer secret | Exact configured webhook key is required before subscription writes |

Service-role clients are server-side implementation details. They may be used
only after the user JWT, service-role bearer, or webhook secret has passed its
function-specific check. Secrets must not be returned in responses or written
to logs. The daily workflow and server-side admin routes are the intended
callers for service-only push functions.

## CORS decision and follow-up

The repository does not contain a verified inventory of every development,
TestFlight, production, and webhook origin. This change therefore does not
guess an allowlist or alter runtime CORS behavior. Before narrowing `*`, record
the approved origins per environment, apply the same preflight and response
policy to every function, and verify browser and non-browser callers. Until
then, the wildcard is a documented security follow-up, never an authorization
decision.

## Regression and verification

Run the source contract without credentials or network access:

```bash
deno test --allow-read supabase/functions/authorization-contract.test.ts
```

The test checks all eight admin API routes, all fourteen Edge Functions, the
credential class, user scoping markers, service-only rejection markers, and
the explicit CORS representation. It proves repository contract consistency,
not live Supabase JWT validation, hosted secrets, provider configuration, or a
deployed function response. Those require a separately authorized environment
test and must not be inferred from this document.
