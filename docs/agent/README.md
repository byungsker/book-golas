# Bookgolas Agent Surface

Bookgolas exposes an authenticated, user-scoped Agent API and a deterministic
CLI companion at contract version `0.1.0`.

## Quickstart

```bash
cd agent-api
deno run --allow-env --allow-net src/server.ts
```

In a second terminal:

```bash
cd cli
BOOKGOLAS_API_URL=http://127.0.0.1:8787 \
BOOKGOLAS_API_TOKEN="<Supabase user access token>" \
node bin/bookgolas.mjs library
```

The token is a user access token, not a service-role key. Keep it in the
process environment or approved secret custody. The API derives the user scope
from that token and rejects `user_id` query parameters.

## Contract files

- `agent-api/openapi.yaml` is the API contract.
- `agent-api/capabilities.json` is the machine-readable capability catalog.
- `cli/schemas/` contains authenticated response, discovery, and error schemas.
- `docs/agent/skills/bookgolas/SKILL.md` is the portable agent usage contract.
- `docs/agent/compatibility.md` records tested host claims.

The 0.1.0 surface is read-only. Recall and Insights commands retrieve stored
user-owned records; they do not invoke a model, create a new generation, or
write usage rows. Any future write must first add dry-run, explicit approval,
idempotency, and postcondition evidence to the contract.

## Boundaries

The API calls Supabase REST with the authenticated user's token and existing
RLS policies. The CLI only calls the API over HTTP. No production deployment,
package publication, subscription reactivation, or live provider call is
part of this implementation.
