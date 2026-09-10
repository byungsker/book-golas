# BOK-417 verification record

Implementation and final UI source were verified from exact commit `6a85337f0d1e1cc93dd8051803887791ab23d2ff` on the isolated branch `codex/feature/web/1.1.0/BOK-417-function-contracts`, targeting `version/web/1.1.0`.

## RED

The initial issue state had no `test:function-contracts` npm script, so the setup gate first failed with:

```text
npm --prefix web run test:function-contracts
Missing script: "test:function-contracts"
```

After the harness and fixture existed, the pre-fix implementation at baseline receipt `d25d93b0a57ebd5da84efe189535fa00d0f3fe21` produced the intended RED result when run with the final cross-user fixture:

```text
exit 1
FAIL 3 contract assertions
delete-user: valid request rejects foreign row-derived storage paths
delete-user: valid request rejects foreign profile avatar objects
delete-user: valid request rejects foreign default avatar objects
```

The red transcript is recorded outside the repository at `/private/tmp/b417-red-baseline-function-contracts.log`. Review-driven failures then identified durable consent production, stranded Recall reservations, provider I/O bounds, export size bounds, Auth deletion replay, cross-user image deletion, localized unavailable-state presentation, first-note source ownership, stored provider-input bounds, user-scoped deletion receipts, and revoked-token deletion replay. Each was fixed and rechecked.

The final fixture records required consent for AI/OCR consumers and explicit not-applicable consent dispositions for book search, export, and account deletion; the harness executes every consentRequired entry without null skips.

## GREEN

At exact final commit `6a85337f0d1e1cc93dd8051803887791ab23d2ff`:

```text
npm --prefix web run test:function-contracts                    exit 0
PASS 11 consumer function contracts with request-level happy and failure coverage
PASS note first-write, foreign existing-source, and foreign-image-source ownership boundaries
PASS stored provider-input bound/filter scenarios
PASS cross-user provider/service mutation guards
PASS provider timeout and oversized-response boundaries
PASS delete-user replay after Auth deletion is idempotent
PASS delete-user rejects foreign legacy storage objects by storage ownership
PASS refreshed-token delete replay resumes the user receipt without a second rate-limit budget
PASS revoked-token replay cannot advance a data-deleted receipt or perform a service mutation
PASS successful Auth deletion precedes the failed completion update and revoked replay returns a safe terminal result
PASS Auth deletion failure is recoverable by a verified retry without a second data deletion

npm --prefix web run test:function-contracts -- --grep cross-user exit 0
Selected 11 contract cases for cross-user
PASS 11 consumer function contracts with request-level happy and failure coverage

cd web && npx vitest run src/app/api/consumer/consent/route.test.ts exit 0
Test Files  1 passed (1)
Tests       3 passed (3)

npm --prefix web run test:product-contracts       exit 0
Test Files  2 passed (2)
Tests       44 passed (44)

npm --prefix web test                             exit 0
Test Files  9 passed (9)
Tests       74 passed (74)

npm --prefix web run test:parity-matrix           exit 0
parity matrix passed: 20 routes, 53 overlays, 8 capabilities

npm --prefix web run test:parity-matrix:negative exit 0
parity negative fixtures passed: 59

npm --prefix web run lint                          exit 0
npm --prefix web run typecheck                     exit 0
npm --prefix web run build                         exit 0
TypeScript syntax parse: 40 files, 0 failures

cd web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:3102 npx playwright test tests/e2e/blab-parity.spec.ts --project=chromium --workers=1 exit 0
5 passed (28.1s)
```

The function harness executes the shared contract modules in a TypeScript VM and covers all eleven functions across valid, malformed, unauthenticated, cross-user, consent, oversized input, rate/quota, provider failure, timeout, oversized provider response, export escaping, storage ownership, note first-write, stored provider-input bounds, and deletion replay scenarios.

## SURFACE

The `byungsker-docker` context applied `20260910125000_scope_account_deletion_operations_per_user.sql` idempotently after `20260910124000_add_account_deletion_operations.sql` to `supabase_db_book-golas-413-review`. The transactional receipt check passed. The redacted receipt is outside the repository at `/private/tmp/bookgolas-web-417-surface-v4.log`:

```text
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
```

The receipt table exists, `authenticated` has no SELECT privilege, `service_role` has the required write privilege, the table has no foreign key so its status survives Auth deletion, and a transactional `started` receipt insert rolled back cleanly after the unique user scope was exercised.

The Playwright run built a fresh production Next server on `http://127.0.0.1:3102` and exercised Korean and English BLDS consumer states at mobile and desktop viewports plus missing-session fail-closed behavior. All five Chromium scenarios passed. The four static screenshots and independent visual review are recorded under:

- `.omo/evidence/bookgolas-web-app-parity/visual-qa/ko-desktop.png`
- `.omo/evidence/bookgolas-web-app-parity/visual-qa/en-desktop.png`
- `.omo/evidence/bookgolas-web-app-parity/visual-qa/ko-mobile.png`
- `.omo/evidence/bookgolas-web-app-parity/visual-qa/en-mobile.png`
- `.omo/evidence/bookgolas-web-app-parity/BOK-417-visual-review.md`

The visual source files were unchanged between the capture revision `ffd6aec40fbba47ce442f2a4ca94288a9b1dd61e` and final commit `6a85337f0d1e1cc93dd8051803887791ab23d2ff`; the fresh Chromium run verified that final build and interaction surface.

Deno HTTP boot was unavailable because the remote Supabase CLI shim lacks `supabase-go`; the request-level Node harness, TypeScript syntax parser, local Next/Chromium surface, and remote Postgres surface provide the available runtime evidence.

## CLEANUP

The protected `/private/tmp/bookgolas-web-blds-453` path was not modified; it was absent in this host snapshot. The implementation worktree is isolated at `/private/tmp/bookgolas-web-417`. Native app paths and `.omo/plans/**` were removed from the final Web branch diff according to `.byungskerlab/branch-policy.json`. Temporary browser output was restored or removed. No secrets or PII were written to the repository or evidence.

Plan: .omo/plans/bookgolas-web-app-parity.md
