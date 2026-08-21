# Edge Function HTTP Wrapper — 1.1.0

## Scope

`supabase/functions/_shared/edge-http.ts` is the shared HTTP boundary for
Edge Functions. BOK-418 applies it first to the low-risk `log-push-click`
function; broader AI and push adoption remains follow-up work.

## API and behavior

```ts
serve(withEdgeFunction("function-name", async (req, context) => {
  return jsonResponse({ success: true }, 200, context);
}));
```

The wrapper handles `OPTIONS`, applies the repository CORS policy, propagates a
safe `x-request-id` or generates one, and adds the ID to the response header.
It emits one structured event with `functionName`, `requestId`, `status`,
`latencyMs`, and `errorCode`. `jsonResponse` keeps the existing JSON body
shape. `errorResponse` assigns a bounded internal error code while preserving
the public `{ "error": "..." }` shape.

## Masking and compatibility

Thrown errors are converted to `500 { "error": "Internal server error" }`.
Provider response bodies, exception messages, authorization headers, request
bodies, user IDs, and database error objects are never written to the wrapper
event. Error codes are lowercase identifiers limited to 64 characters. The
existing `log-push-click` success payloads and status codes remain unchanged;
the wrapper standardizes the HTTP boundary through OPTIONS handling, CORS,
safe request IDs, response metadata headers, structured timing logs, and
exception masking.

## Verification boundary

The shared wrapper tests cover success metadata, preflight, unsafe request-ID
replacement, public error compatibility, and exception masking. The existing
authorization contract continues to verify that `log-push-click` authenticates
the caller and scopes privileged `push_logs` updates by `user_id`.

```bash
deno test --allow-read supabase/functions/_shared/edge-http.test.ts
deno test --allow-read supabase/functions/authorization-contract.test.ts
deno check --config supabase/functions/deno.json supabase/functions/log-push-click/index.ts
```

No provider call, credential change, Supabase project mutation, deployment, or
production data access is part of this wrapper change.
