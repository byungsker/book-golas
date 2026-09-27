# Bookgolas Consumer Web 1.1.0 release runbook

This runbook is the release boundary for the consumer Web line. It describes the
configuration and evidence required to validate a Preview-like environment. The
task does not deploy Production, change the admin allow-list, or enable Web billing.

## Release contract

The machine-readable source is web/docs/consumer-web-release-config.json. The
release line is version/web/1.1.0 and the build uses Next 16.3.0-preview.8 on
Node 22.

The CI-equivalent, secrets-free gate is one command from `web`:

    npm ci
    npm run test:release-gate

`test:release-gate` runs `npm test` (unit tests plus every focused positive and
negative consumer contract), lint, typecheck, a production build, and Playwright
in Chromium, Firefox, and WebKit. `npm test` includes auth, onboarding, session,
home/book-list, library, discovery, lifecycle, detail, progress, timer,
notes/highlights, images/OCR, review/share, calendar, charts/goals, AI
consent/artifacts, account settings/deletion, export, Recall, Web Push, offline,
BLDS/UI, and parity positive/negative commands. The command inventory is versioned
in `consumer-web-release-config.json`; `test:release-config` rejects an omitted
command before CI execution.

For focused diagnosis, the same gate can be expanded without changing its order:

    npm test
    npm run lint
    npm run typecheck
    npm run build
    npm run test:e2e:all

The build command runs test:release-config before next build. A release candidate
must reject a missing required environment variable before the Next build:

    npm run test:release-config -- --fixture missing-required-env
    npm run test:release-config -- --fixture missing-gate-command

Both commands are expected to exit with status 1. The first removes
NEXT_PUBLIC_SUPABASE_ANON_KEY from a synthetic Preview environment; the second
removes `test:auth-boundary` from an in-memory copy of the aggregate command
list. Neither fixture changes tracked files or contacts a hosted service.

## Ownership and fail-closed stop conditions

| Gate | Owner | Evidence boundary | Stop condition |
| --- | --- | --- | --- |
| Secrets-free contract/build/browser gate | PR author and GitHub Actions `quality.yml` | Local fixtures and loopback Playwright only | Stop on any non-zero command, missing package/browser binary, omitted inventory command, or task-owned server cleanup failure |
| Local Docker schema/reset/lint | PR author locally; GitHub Actions `schema-check.yml` in CI | Local Docker-backed Supabase only | Stop if Docker/Supabase is unavailable, reset/lint fails, or migration order differs; do not report schema readiness |
| Hosted disposable Preview CORS/JWT/RLS/email/provider checks | Bookgolas release owner / Preview environment administrator | Isolated Preview project and disposable users only | Stop before hosted checks if any required Preview value is missing, blank, placeholder, Production-scoped, or cannot be verified without disclosure |
| Production deployment | Bookgolas production release owner under the separate deployment approval process | Production only | Out of scope for this gate; do not deploy or infer Production parity from local/Preview results |

CI does not receive Supabase or provider secrets. The quality gate therefore
proves deterministic local contracts and browser behavior only. `schema-check.yml`
owns local schema execution, while the hosted Preview owner must separately run
the hosted checks after provisioning an isolated environment. A skipped or
unavailable local schema or hosted Preview check is a blocker, never a pass.

## Vercel environment

| Variable | Scope | Rule |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Preview and Production | Match the Supabase project for the same scope |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Preview and Production | Public client key for the matching project |
| SUPABASE_SERVICE_ROLE_KEY | Preview and Production | Server-only; never expose as NEXT_PUBLIC |
| GOOGLE_BOOKS_API_KEY | Optional server | Provider key only when the route is configured |
| NAVER_CLIENT_ID | Optional server | Provider identifier only when the route is configured |
| NAVER_CLIENT_SECRET | Optional server | Server-only provider secret |

Preview must use the isolated Preview Supabase project. Production credentials
must never be copied into Preview. Provider keys, service-role keys and Edge
secrets must not be placed in client-visible variables.

Hosted Preview preflight status is currently **BLOCKED**. The four required
Preview values are absent: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
`WEB_ALLOWED_ORIGINS`. The owner is **Bookgolas release owner / Preview
environment administrator**. Local fixture and route-stub checks do not replace
hosted Preview CORS/JWT/RLS, email, or provider-stub verification. Provision the
isolated Preview credentials and origin through the deployment secret store
without exposing values, then rerun the hosted checks below.

Run `npm run test:release-config -- --environment preview` only in the isolated
Preview job after its secret store has supplied all four values. Missing, blank,
placeholder, localhost, or unverifiable scope values must exit non-zero. Do not
print the values while diagnosing the failure.

## Supabase order

Use the pinned task-scoped CLI and local Docker-backed Supabase instance for
schema checks. The global Supabase CLI 2.109.0 is not part of this gate:

    npx --yes supabase@2.108.0 start
    npx --yes supabase@2.108.0 db reset --local
    npm run reset:fixtures
    npx --yes supabase@2.108.0 db lint --local --level error

The local owner is the PR author (or the `schema-check.yml` runner). If the Docker
daemon/socket, pinned CLI, reset, or lint is unavailable, stop and record the
missing dependency; do not continue to a release-ready conclusion. These local
commands use no hosted credentials and do not prove the hosted Preview schema.

The fixture runtime performs two complete resets, then uses synthetic local JWTs
to read each owner's rows and private storage object while proving that the other
fixture owner's row and object remain invisible. It never uses hosted credentials
or stops the shared local stack.

The migration order for an isolated environment is:

    npx --yes supabase@2.108.0 db reset --local
    npx --yes supabase@2.108.0 db lint --local --level error
    npx --yes supabase@2.108.0 db push --include-all
    npx --yes supabase@2.108.0 migration list
    npm run reset:fixtures

Development project ref is reoiqefoymdsqzpbouxi. Production project ref is
enyxrgxixrnoazzgqyyd. Link or push commands must name the intended project:

    npx --yes supabase@2.108.0 link --project-ref "$SUPABASE_PROJECT_REF_DEV"
    npx --yes supabase@2.108.0 db push --include-all
    npx --yes supabase@2.108.0 migration list

The deploy workflow is manual and requires the matching GitHub environment secrets.
Do not run its Production target for this issue.

## Edge Function Preview check

Set PREVIEW_ORIGIN to the disposable Preview origin and use the matching Preview
Supabase project ref:

    export PREVIEW_ORIGIN=https://preview.example.invalid
    export PREVIEW_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/<function-name>
    curl -i -X OPTIONS "$PREVIEW_FUNCTION_URL" -H "Origin: $PREVIEW_ORIGIN" -H "Access-Control-Request-Method: POST"
    curl -i -X POST "$PREVIEW_FUNCTION_URL" -H "Origin: $PREVIEW_ORIGIN" -H "Content-Type: application/json" -d '{}'

OPTIONS must return 204 with the configured Preview origin. The unauthenticated
POST must return 401 and contain no private data. A disposable authenticated
Preview user may then be used to check that auth.getUser validates the bearer
token and RLS limits reads and writes to auth.uid() = user_id. Check a disallowed
Origin as well; WEB_ALLOWED_ORIGINS must not reflect it.

These hosted checks are Preview-only. Do not deploy Production or mutate
Production data as part of this release-readiness task.

## Admin and consumer boundary

The admin boundary remains deny-by-default. Unauthenticated /admin requests go to
/admin/login, and only the explicit email allow-list can pass the proxy and
requireAdminUser guard. Every web/src/app/api/admin route checks that guard before
reading or writing data.

The root /privacy, /terms and /support routes redirect to /ko/privacy,
/ko/terms and /ko/support. The /en and /ko localized routes render localized
metadata and copy. Web subscription controls are disabled, Web does not claim an
active subscription, and Web offline parity is not claimed. Native-only boundaries
remain iOS widgets, Siri/App Shortcuts, native push, camera/OCR, share sheet and
RevenueCat subscriptions.

## Browser surface

Run all configured browser projects from web:

    npm run test:e2e:all

The underlying projects are Chromium, Firefox, and WebKit. A missing binary or a
partial project run is unavailable/failed evidence, not an all-browser pass. The
gate starts a separate one-worker Playwright process for each browser so each gets
a fresh loopback route-state server. Running projects together can carry mutable
fixture state from one browser into the next and produce misleading failures. A
single bounded retry reruns the entire browser project in another fresh process;
per-test retries are disabled because they would reuse mutated fixture state. A
second project failure remains a hard gate failure and must not be reported as
passing.

The Playwright fixture server is loopback-only. Existing marketing, localized
metadata, legal and admin route assertions must remain green.

## Rollback and feature flags

Identify the last healthy immutable deployment or release tag first. Redeploy the
same artifact when possible. If source history must be reversed, open a revert PR
for the exact merge commit. Verify authentication, core consumer routes, logs and
data access after rollback.

Application source rollback does not roll back Supabase schema, data, Edge Function
deployment, provider configuration or RevenueCat state. Check compatibility and
use a separate database or external-state rollback procedure.

The release feature flag is webBilling=false. The route fixture remains
loopback-only. Do not turn on Web billing, widen the admin allow-list, or use a
Production deploy as a substitute for Preview evidence.

Plan: .omo/plans/bookgolas-web-app-parity.md
