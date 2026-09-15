# Task 10 code review

- Revision: `34beb1120d3b31c3b969f7ef4b634cc3c2d152a2`
- Branch: `codex/feature/web/1.1.0/BOK-422-consumer-routing`
- Base: `version/web/1.1.0` at `ea3a72138181c737bbd1f69ace90e5a44d43728e`
- Plan: `.omo/plans/bookgolas-web-app-parity.md`
- Result: **APPROVE**

## Review scope

The route group moves, proxy boundary, localized layouts and metadata, consumer path allowlist, owner scoped data access, route fixture, route contract runner, negative fixture and Chromium route suite were reviewed at the committed revision.

## Findings

No blocking or follow-up findings were found.

- The `(auth)` and `(consumer)` route groups preserve the existing auth, home, account, detail and reading source content. The changed detail branches expose typed not-found or unavailable states for the route contract.
- `proxy.ts` keeps the admin boundary first and deny-by-default. Consumer routes use an explicit allowlist, preserve query strings in `returnTo`, and redirect unauthenticated localized requests to the matching locale sign-in route.
- `getSafeNextPath` rejects external, protocol-relative, traversal, encoded traversal, backslash, cross-locale, legal, admin and other non-consumer targets. A malformed dynamic detail id is still protected by the consumer layout before server rendering.
- Consumer data access retains the authenticated `user_id` ownership filter. The route fixture is enabled only in explicit test mode with a loopback Supabase URL and fails closed for normal or remote configuration.
- Korean and English route copy, route metadata, required loading/error/empty/unauthorized behavior and the canonical route templates are covered by the contract runner and browser suite.

## Verification

- `npm test` passed: 20 Vitest files, 151 tests; parity matrix 20 routes, 53 overlays, 8 capabilities; 59 parity negative fixtures.
- `npm run test:consumer-routes` passed: 5 Vitest files, 48 tests.
- `npm run typecheck`, `npm run lint` and `npm run build` passed.
- Loopback production browser QA passed: 4 Chromium route tests and the focused unauthorized test.
- `git diff --check` passed and the temporary server, Playwright workers and port 3102 were absent after QA.
- The protected `/private/tmp/bookgolas-web-blds-453` worktree was preserved without reset, checkout, deletion or modification.
