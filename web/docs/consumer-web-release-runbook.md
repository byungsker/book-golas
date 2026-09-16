# Bookgolas Consumer Web 1.1.0 release runbook

This runbook is the release boundary for the consumer Web line. It describes the
configuration and evidence required to validate a Preview-like environment. The
task does not deploy Production, change the admin allow-list, or enable Web billing.

## Release contract

The machine-readable source is web/docs/consumer-web-release-config.json. The
release line is version/web/1.1.0 and the build uses Next 16.3.0-preview.8 on
Node 22.

Run the checks from web:

    npm ci
    npm run test:release-config
    npm run lint
    npm run build

The build command runs test:release-config before next build. A release candidate
must reject a missing required environment variable before the Next build:

    npm run test:release-config -- --fixture missing-required-env

The command is expected to exit with status 1. The fixture removes
NEXT_PUBLIC_SUPABASE_ANON_KEY from a synthetic Preview environment and never
contacts a hosted service.

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

## Supabase order

Use the local CLI and local Docker-backed Supabase instance for schema checks:

    supabase start
    supabase db reset --local
    npm run reset:fixtures
    supabase db lint --local --level error
    supabase stop

The migration order for an isolated environment is:

    supabase db reset --local
    supabase db lint --local --level error
    supabase db push --include-all
    supabase migration list
    npm run reset:fixtures

Development project ref is reoiqefoymdsqzpbouxi. Production project ref is
enyxrgxixrnoazzgqyyd. Link or push commands must name the intended project:

    supabase link --project-ref "$SUPABASE_PROJECT_REF_DEV"
    supabase db push --include-all
    supabase migration list

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

Run each configured browser project from web:

    npm run test:e2e -- --project=chromium
    npm run test:e2e -- --project=webkit
    npm run test:e2e -- --project=firefox

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
