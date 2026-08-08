# Growth Scorecard Data Contract

`control-plane-metrics` exposes only aggregate Bookgolas product-usage counts to
the byungskerlab Company Control Plane.

The endpoint is server-to-server, accepts only `GET`, requires a dedicated
`CONTROL_PLANE_METRICS_TOKEN`, and returns no user identifiers, emails, book
content, reading notes, queries, or other row-level records.

## Metrics

- total and new users;
- seven-day active users;
- book totals, recent books, and users with at least one book;
- reading-record totals, recent records, and users with at least one record;
- AI Recall totals, recent recalls, and users with at least one recall.

## Environments

Local work and TestFlight use the development Supabase project. Production is
configured only through the approved production CI path. Both environments
must use a random token of at least 32 characters, and the Company Control
Plane private config must carry the matching environment token.

The `Deploy Control Plane Metrics` workflow is the approved path. It applies
the repository migrations, sets `CONTROL_PLANE_METRICS_TOKEN` and
`CONTROL_PLANE_ENVIRONMENT` in the selected Supabase project, deploys only
this function, and verifies both the authenticated aggregate response and the
401 fail-closed response. Configure the repository secrets
`CONTROL_PLANE_METRICS_TOKEN_DEV` and `CONTROL_PLANE_METRICS_TOKEN_PROD`
without placing their values in the repository.

## Verification

```bash
deno test --frozen --config supabase/functions/control-plane-metrics/deno.json \
  supabase/functions/control-plane-metrics/index_test.ts
supabase db lint --linked
```

The migration revokes RPC access from `PUBLIC`, `anon`, and `authenticated`;
only `service_role` can execute the aggregate query.

## Rollback

Disable the function deployment and remove its private control-plane source.
If the endpoint secret must be rotated, replace the matching repository secret
and rerun the workflow for that environment.
If the RPC must be removed, apply a forward migration that revokes and drops
`public.get_control_plane_growth_metrics()`.
