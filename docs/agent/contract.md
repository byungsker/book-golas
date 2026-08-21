# Agent API and CLI Contract

## Authentication and authorization

The API accepts `Authorization: Bearer <Supabase user access token>` and
verifies it with Supabase Auth. The authenticated subject is the only accepted
resource scope. A caller-supplied `user_id` is rejected, and the API passes the
same user token to Supabase REST so existing RLS remains the data boundary.

Unauthenticated data calls return `401 authentication_required`. Provider
authentication failure returns `503 authentication_unavailable`. Cross-user
scope attempts return `400 user_scope_forbidden` before a data query.

## JSON and exit contracts

Successful API and CLI calls return:

```json
{
  "data": { "items": [] },
  "meta": {
    "api_version": "v1",
    "contract_version": "0.1.0",
    "request_id": "request-id",
    "generated_at": "2026-08-22T00:00:00.000Z",
    "usage": {
      "capability": "library.list",
      "units": 1,
      "attribution": "authenticated_user",
      "ledger": "shared_bookgolas_account",
      "provider_cost_incurred": false
    }
  }
}
```

Errors use `{ "error": { "code", "message", "request_id", "retryable" } }`.
The CLI keeps protocol JSON on stdout and diagnostics on stderr. Exit codes are
independent from domain results: `0`, `2`, `3`, `4`, `5`, `6`, `7`, and `8`
mean success, usage, authentication, forbidden, upstream, timeout,
rate-limited, and unexpected failure.

The public `capabilities` command uses the dedicated capability response schema;
its anonymous discovery metadata has no authenticated usage attribution.

## Reliability and safety

The CLI sends GET only, uses a 10-second default per-request timeout, permits
at most two retries after the first attempt, and uses 200/400 ms backoff. A
caller may lower retries or change timeout within bounded limits. Pagination is
never automatic or unbounded. The API applies a per-user, per-capability
60-request/minute safety cap in the local process.

Writes are disabled. A future write contract must require dry-run, explicit
approval, idempotency keys, and postcondition evidence before implementation.
