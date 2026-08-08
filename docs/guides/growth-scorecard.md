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

Local work and TestFlight use the development Supabase project. Both
environments use the approved private CLI runbook below, must use a random
token of at least 32 characters, and must carry the matching environment token
in the Company Control Plane private config.

The CLI runbook below is the approved deployment path. It applies the
repository migrations, sets `CONTROL_PLANE_METRICS_TOKEN` and
`CONTROL_PLANE_ENVIRONMENT` in the selected Supabase project, deploys only
this function, and verifies both the authenticated aggregate response and the
401 fail-closed response. Keep the token in the approved private secret store;
never put it in the repository, shell history, or a shared `.env` file.

## Verification

```bash
deno test --frozen --config supabase/functions/control-plane-metrics/deno.json \
  supabase/functions/control-plane-metrics/index_test.ts
supabase db lint --linked
```

For an environment deployment, authenticate the Supabase CLI, link the exact
project, and use a private, temporary env file containing only the two
`CONTROL_PLANE_*` settings:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
mkdir -p "$CONTROL_PLANE_EVIDENCE_DIR"
chmod 700 "$CONTROL_PLANE_EVIDENCE_DIR"
git rev-parse HEAD > "$CONTROL_PLANE_EVIDENCE_DIR/source-commit-before.txt"
supabase functions list --project-ref "$SUPABASE_PROJECT_REF" \
  > "$CONTROL_PLANE_EVIDENCE_DIR/functions-before.txt"
supabase db push --include-all
supabase secrets set --env-file "$CONTROL_PLANE_ENV_FILE"
supabase functions deploy control-plane-metrics
supabase functions list --project-ref "$SUPABASE_PROJECT_REF" \
  > "$CONTROL_PLANE_EVIDENCE_DIR/functions-after.txt"

endpoint="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/control-plane-metrics"
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $(<"$CONTROL_PLANE_METRICS_TOKEN_FILE")" \
  "$endpoint" > "$CONTROL_PLANE_RESPONSE_FILE"
jq -e '
  .schema_version == 1 and
  .product_id == "bookgolas" and
  .admin.scope == "aggregate_metrics_only" and
  (.analytics.metrics | type == "object") and
  (has("user_id") | not) and
  (has("email") | not)
' "$CONTROL_PLANE_RESPONSE_FILE" >/dev/null
```

The private env file must set `CONTROL_PLANE_METRICS_TOKEN` to a random value
of at least 32 characters and `CONTROL_PLANE_ENVIRONMENT` to `development` or
`production`. Remove the temporary env and response files after verification.
Retain the private `functions-before.txt`, `functions-after.txt`, and source
commit evidence according to the operations retention policy. To roll back,
check out the known-good commit recorded in `source-commit-before.txt` and
rerun `supabase functions deploy control-plane-metrics`, then verify the
endpoint again.

The migration revokes RPC access from `PUBLIC`, `anon`, and `authenticated`;
only `service_role` can execute the aggregate query.

## Rollback

If the endpoint secret must be rotated, replace the matching private secret and
rerun this CLI procedure for that environment.
If the RPC must be removed, apply a forward migration that revokes and drops
`public.get_control_plane_growth_metrics()`.
