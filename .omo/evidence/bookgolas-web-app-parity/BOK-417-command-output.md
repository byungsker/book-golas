# BOK-417 verification record

Implementation and final consumer-function sources were verified from exact commit 826f419282e94fabdb779bae2254f43a7abb5d31 on branch codex/feature/web/1.1.0/BOK-417-function-contracts, targeting version/web/1.1.0.

## RED

The initial issue state had no test:function-contracts npm script, so the setup gate first failed with:

npm --prefix web run test:function-contracts
Missing script: test:function-contracts

The pre-fix batch baseline at receipt 920935983837e2194c5386087c8575e8cf8f494f, run with the final contract fixture and harness before the hardening commit, produced:

exit 1
FAIL 13 contract assertions
- generate-embedding: source-less note is rejected
- generate-embedding: source-less note returns invalid_request
- generate-embedding: source-less note stops before provider work
- shared contract rejects explicit null instead of applying an integer fallback
- recall-search: databaseFailure status 502 matches 503
- recall-search: databaseFailure code provider_error matches unavailable
- reading-insights: databaseFailure status 502 matches 503
- reading-insights: databaseFailure code provider_error matches unavailable
- export-reading-data: CSV quotes bare carriage returns
- export-reading-data: databaseFailure status 502 matches 503
- export-reading-data: databaseFailure code provider_error matches unavailable
- delete-user: valid request removes ownerless objects from validated user paths
- delete-user: resumed deletion consumes its bounded resume budget

The complete red transcript is recorded outside the repository at /private/tmp/b417-red-baseline-function-contracts-v5.log.

## GREEN

At exact final commit 826f419282e94fabdb779bae2254f43a7abb5d31:

npm --prefix web run test:function-contracts: exit 0
PASS 11 consumer function contracts with request-level happy and failure coverage
PASS explicit-null integer rejection, source-less note rejection, revoked-token auth modeling
PASS ownerless Storage deletion, bounded deletion resume budget, foreign path rejection
PASS export query ownership before limit, CSV formula and bare-carriage-return escaping
PASS database failures use unavailable while provider failures retain provider_error
PASS provider timeout, oversized-response and stored-input bounds

npm --prefix web run test:function-contracts -- --grep cross-user: exit 0
Selected 11 contract cases for cross-user
PASS 11 consumer function contracts with request-level happy and failure coverage

npm --prefix web test: exit 0
Test Files 9 passed (9)
Tests 74 passed (74)

npm --prefix web run test:parity-matrix: exit 0
parity matrix passed: 20 routes, 53 overlays, 8 capabilities

npm --prefix web run test:parity-matrix:negative: exit 0
parity negative fixtures passed: 59

npm --prefix web run lint: exit 0
npm --prefix web run typecheck: exit 0
npm --prefix web run build: exit 0

The function harness covers all eleven functions across valid, malformed, unauthenticated, cross-user, consent, oversized input, rate/quota, provider failure, database failure, timeout, oversized provider response, export escaping, storage ownership, note first-write/source requirement, stored provider-input bounds, explicit consent dispositions, and deletion replay scenarios.

## SURFACE

The byungsker-docker context applied 20260910125000_scope_account_deletion_operations_per_user.sql idempotently after 20260910124000_add_account_deletion_operations.sql to supabase_db_book-golas-413-review. The transactional receipt check passed and remains applicable because this hardening commit changes no migration:

== migration apply ==
DELETE 0
DROP INDEX
CREATE INDEX
exit 0
== transactional receipt surface ==
account_deletion_operations_pkey|CREATE UNIQUE INDEX account_deletion_operations_pkey ON public.account_deletion_operations USING btree (token_hash)
account_deletion_operations_user_idx|CREATE UNIQUE INDEX account_deletion_operations_user_idx ON public.account_deletion_operations USING btree (user_id)
00000000-0000-4000-8000-000000000417|started
exit 0

The redacted receipt is outside the repository at /private/tmp/bookgolas-web-417-surface-v4.log. The receipt table has no Auth foreign key, its user_id uniqueness is enforced, and the transactional insert rolled back cleanly after verification.

The four static screenshots and independent visual review remain valid because the UI capture source files were unchanged by this backend, harness, and consent-streaming hardening commit. A fresh production build passed after commit 826f419. The prior Chromium run covered Korean and English BLDS consumer states at mobile and desktop viewports plus missing-session fail-closed behavior.

Deno HTTP boot was unavailable because the remote Supabase CLI shim lacks supabase-go; the request-level Node harness, Next production build, and remote Postgres surface provide the available runtime evidence.

## CLEANUP

The protected /private/tmp/bookgolas-web-blds-453 path was not accessed or modified. The implementation worktree is isolated at /private/tmp/bookgolas-web-417. Native app paths and .omo/plans/** remain outside the final Web branch diff according to .byungskerlab/branch-policy.json. Temporary browser output was restored or removed. No secrets or PII were written to the repository or evidence.

Plan: .omo/plans/bookgolas-web-app-parity.md
