# Bookgolas Web parity task 36 release evidence

- Issue: #448
- Parent: #412
- Task: 36
- Target version: 1.1.0
- Target branch: version/web/1.1.0
- Feature branch: codex/feature/web/1.1.0/BOK-448-release-readiness
- Plan: .omo/plans/bookgolas-web-app-parity.md
- Commit title: chore(release): document and verify consumer web release boundary

## RED

Before implementation, the required release gate did not exist:

    npm run test:release-config -- --fixture missing-required-env

The command failed with npm error Missing script: test:release-config and
exit 1. The raw record is task-36-RED-release-config.log.

## GREEN

The release contract and negative fixture were added before the Next build:

    npm run test:release-config

Passed with consumer web release config passed.

    npm run test:release-config -- --fixture missing-required-env

Exited 1 with release config fixture rejected the missing required environment
before next build. The fixture removes NEXT_PUBLIC_SUPABASE_ANON_KEY from a
synthetic Preview environment and does not call a hosted service.

    npm run lint
    npm test
    npm run build

All three commands passed. The build executed the release-config gate, compiled
with Next 16.3.0-preview.8, completed TypeScript, generated 41 static pages and
completed route optimization. Logs are task-36-SURFACE-lint.log,
task-36-SURFACE-npm-test.log and task-36-SURFACE-build-rerun.log.

## SURFACE

The #448 route surface passed in every configured browser:

    npx playwright test tests/e2e/routes.spec.ts --project=chromium
    npx playwright test tests/e2e/routes.spec.ts --project=webkit
    npx playwright test tests/e2e/routes.spec.ts --project=firefox

Each run passed 4 tests. The checks cover localized consumer boundaries, safe
return targets, root legal redirects to /ko routes, ko/en metadata and legal
copy, and the deny-by-default /admin redirect.

The acceptance full-surface commands were also run:

- Chromium: 159 passed, 6 existing BLDS/UI primitive failures.
- WebKit: 156 passed, 9 existing BLDS/clipboard/consumer-shell failures.
- Firefox: 158 passed, 7 existing BLDS/clipboard/consumer-shell failures.

The failures are outside the #448 change set. They reproduce in
tests/e2e/blab-parity.spec.ts, tests/e2e/ui-primitives.spec.ts,
tests/e2e/consumer-shell.spec.ts, tests/e2e/recall.spec.ts and
tests/e2e/review-share.spec.ts. The cross-browser errors are missing BLDS
refresh fixture elements, an existing sign-in return query mismatch, focus
timing, unsupported clipboard permissions and browser share fallback behavior.
The full command logs are task-36-SURFACE-chromium.log,
task-36-SURFACE-webkit.log and task-36-SURFACE-firefox.log.

Local migration verification was attempted without touching Production:

    supabase db reset --local
    supabase db lint --local --level error

The first attempt failed because the configured Docker daemon was unavailable.
Docker context byungsker-docker was checked over Tailscale. The remote Mac
reported Docker Desktop 29.7.2 once after an open -a Docker request, but the
daemon did not remain available to Supabase. A direct backend launch exited with
an operation-not-permitted error while reading the Docker settings store. The
reset and lint records are task-36-SURFACE-migration-reset.log and
task-36-SURFACE-migration-lint.log. Local Supabase reset and lint remain an
operational blocker for this host; no hosted migration or Production deploy was
attempted.

Hosted Edge URL, CORS, JWT and RLS checks were not executed because no disposable
Preview credentials or Preview origin were configured in this session. The
runbook documents the safe OPTIONS and unauthenticated POST checks and explicitly
prohibits Production deployment.

## CLEANUP

The release contract is machine-checkable in
web/docs/consumer-web-release-config.json. The runbook is
web/docs/consumer-web-release-runbook.md, and the negative input is
web/scripts/fixtures/release-config-negative.json. The package build now runs
the contract before next build and the full test script includes the positive
contract gate.

Root legal pages now redirect to localized routes. Localized legal metadata and
copy describe Web billing as unavailable, native purchases as native-only, and
network access as required. The subscription route remains disabled. The admin
proxy, server guard, API guards, Supabase fail-closed settings, Edge CORS/JWT
boundary and RLS ownership markers are checked by the release script.

Generated screenshots from the browser run were restored so this change set
contains only the #448 source, documentation, scripts and evidence files.
No secret values were added, no admin policy was widened, and no Production
resource was changed.
