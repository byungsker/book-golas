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

## Verification

```bash
deno test supabase/functions/control-plane-metrics/index_test.ts
supabase db lint --linked
```

The migration revokes RPC access from `PUBLIC`, `anon`, and `authenticated`;
only `service_role` can execute the aggregate query.

## Rollback

Disable the function deployment and remove its private control-plane source.
If the RPC must be removed, apply a forward migration that revokes and drops
`public.get_control_plane_growth_metrics()`.
