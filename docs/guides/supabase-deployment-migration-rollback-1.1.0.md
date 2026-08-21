# Supabase Deployment, Migration, and Rollback Runbook — 1.1.0

## Scope and authority

This runbook covers the `operations` delivery unit on the `1.1.0` continuous
line. It records the repository workflows and safe operator checks; it does
not authorize a production deployment, secret rotation, provider change, or
data restore. Production actions require the owner approval and the protected
GitHub environment described below.

The repository has two Supabase projects:

| Environment | Project ref | Approved path | Boundary |
| --- | --- | --- | --- |
| Development | `reoiqefoymdsqzpbouxi` | `dev` push → TestFlight workflow | Use for local integration and TestFlight validation. |
| Production | `enyxrgxixrnoazzgqyyd` | `main` push → Production workflow | Never link or deploy from a local shell. |

The standalone `Deploy Edge Functions` workflow is manual and accepts `dev`
or `prod`. Its `prod` input is not release approval; use it only with explicit
owner authority and an immutable `main` source. It applies functions only and
does not apply database migrations.

## Credentials and runtime configuration

Only names belong in the runbook. Never copy a value into a commit, issue,
terminal transcript, or CI summary.

Workflow deployment secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF_DEV` and `SUPABASE_PROJECT_REF_PROD`
- `REVENUECAT_WEBHOOK_AUTH_KEY_DEV` and `REVENUECAT_WEBHOOK_AUTH_KEY_PROD`

Function runtime secrets observed in source:

- Common Supabase values: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`
- AI functions: `OPENAI_API_KEY`
- Push functions: `FIREBASE_SERVICE_ACCOUNT`
- Data export: `RESEND_API_KEY`
- RevenueCat webhook: `REVENUECAT_WEBHOOK_AUTH_KEY`

Before deployment, verify presence in the target environment without printing
values. A missing secret is a stop condition, not a reason to put a fallback
value in source or CI output.

## Preflight and local validation

1. Confirm the source is the approved `dev` or `main` ancestry and the required
   PR checks passed. For this line, the target contract is
   `operations / 1.1.0 / backend-service`.
2. Create migrations only with the Supabase CLI:
   `supabase migration new <description>`. Do not use MCP
   `apply_migration`; its server-generated version can diverge from the file.
3. Validate the local schema and function source before merge:

   ```bash
   supabase db start
   supabase db lint --local --level error
   python3 supabase/tests/test_waitlist_abuse_guards.py
   deno test --allow-read supabase/functions/authorization-contract.test.ts
   deno test --allow-net supabase/functions/send-batch-nudge/daily-reminder_test.ts supabase/functions/send-batch-nudge/deadline-reminder_test.ts
   deno test --config supabase/functions/reading-insights/deno.json --allow-env --allow-net supabase/functions/reading-insights/test.ts
   supabase stop --no-backup
   ```

4. Check migration names, review SQL for destructive operations, and prepare a
   forward-fix or approved restore plan before merge. The schema workflow
   blocks `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, and unapproved mass deletes.

## Approved deployment paths

### Development / TestFlight

After the approved `dev` merge, the iOS TestFlight workflow links the Dev
project, sets the Dev RevenueCat webhook secret, applies
`supabase db push --include-all`, deploys every function with an `index.ts`,
and records `supabase migration list`. The workflow repairs known legacy
versions `20260419123526` and `20260419130933`; those repairs are idempotent
workflow evidence, not a general rollback command. Confirm the migration list
after the run.

### Production / App Store workflow

After the approved `main` merge, the Production workflow enters the
`production` environment, links the Prod project, sets the Prod webhook
secret, reconciles legacy versions `20260419123544` and `20260419130941`,
applies `supabase db push --include-all`, deploys every function, and records
`supabase migration list`. The production environment is expected to enforce
required reviewers and `main` deployment branches. Do not reproduce these
steps with a local production CLI session.

### Function-only dispatch

Use the standalone workflow only when migration state is already known and the
owner explicitly authorizes the target. Set `function_name` to one function
for a bounded redeploy, or leave it empty for all functions. A function-only
run must record the source SHA, target, selected function scope, secret
presence check, deployment result, and smoke result without recording secret
values.

## Migration and partial-failure handling

- Before applying, record the source SHA and the expected migration filenames.
- After applying, compare `supabase migration list` with the repository files.
- If a migration fails, stop the downstream function deploy, preserve the
  redacted CI log and migration version, and do not rerun blindly.
- If only functions fail, keep the database result recorded and redeploy only
  the failed function from the same approved SHA after checking target state.
- `supabase migration repair` reconciles migration history; it does not undo
  schema changes. Use it only for an identified orphan version and explicit
  approval.
- A reversible schema issue uses a reviewed forward-fix migration. A
  destructive data incident requires the provider's approved restore/PITR
  procedure, a named owner decision, and a new validation window. No automatic
  rollback is claimed by this repository.
- Missing or mismatched secrets, migration-list drift, failed smoke checks, or
  an unknown deployed SHA block release completion.

## Post-deploy smoke checklist

Run the safe boundary checks against the target URL first. Use an approved
synthetic account and test payload only for authorized success-path checks.
Never use a real customer's token or content.

1. `reading-insights`: `OPTIONS` returns `204`; a request without a bearer
   token returns `401`; an approved Dev synthetic-user request returns the
   documented success or rate-limit response and a valid response shape.
2. `generate-embedding`: `OPTIONS` returns `204`; an unauthenticated request
   returns `401`; an approved Dev fixture confirms the response shape without
   logging source text or embedding contents.
3. `revenuecat-webhook`: `OPTIONS` returns `204`; a missing or wrong webhook
   key returns `401`; an owner-approved Development `TEST` event returns the
   documented response and remains idempotent on replay. Production test
   events require separate approval.

Safe boundary example:

```bash
FUNCTIONS_BASE='https://<project-ref>.supabase.co/functions/v1'
curl -sS -i -X OPTIONS "$FUNCTIONS_BASE/reading-insights"
curl -sS -i -X POST "$FUNCTIONS_BASE/reading-insights" \
  -H 'Content-Type: application/json' \
  --data '{"userId":"smoke-invalid"}'
curl -sS -i -X OPTIONS "$FUNCTIONS_BASE/generate-embedding"
curl -sS -i -X OPTIONS "$FUNCTIONS_BASE/revenuecat-webhook"
```

Record status codes, timestamp, target, source SHA, function name, and result
category only. A successful HTTP response proves the observed endpoint
contract; it does not prove provider-wide health, migration reversibility, or
store release readiness.
