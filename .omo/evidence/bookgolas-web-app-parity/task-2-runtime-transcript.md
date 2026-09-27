# Task 2 runtime transcript

Target-Delivery-Unit: web
Target-Version: 1.1.0
Delivery-Profile: web-release-train

Tested implementation commit: `2713916a9c0d44f76b631c53afc026c4019ff392`

The final evidence receipt is a metadata-only descendant of the tested implementation commit. Reviewers should verify that its diff contains only the receipt, transcript, and checksum manifest updates.

## RED

The previous review SHA `85401b8903548bf425b03b87ee9d05263f8e8f5e` was blocked by the code-quality gate. The review identified three boundary defects: localized route helpers interpolated an unchecked runtime locale, recommendation success and failure envelopes could contradict one another, and fixture tests re-parsed their own output.

A follow-up review also found that `AuthRequestSchema.next` accepted traversal and a locale different from the request locale.

The original failing-first security regression remains recorded above the implementation history: before `BookIdSchema` validation, `npm run test:product-contracts` exited 1 with 1 failed and 40 passed because `consumerRoutes.book("ko", "../account")` did not throw.

## GREEN

Command: `npm run test:product-contracts`

Observed: exit 0; 2 files and 44 tests passed.

Command: `npm run test:product-contracts -- --grep cross-user-request`

Observed: exit 0; 1 targeted test passed and 43 tests were skipped.

Command: `npm test`

Observed: exit 0; 8 files and 71 tests passed. The parity matrix, 59 negative fixtures, BLDS React parity, BLDS negative fixture and SSR state checks passed.

The route helpers now parse `LocaleSchema` for every localized path. `RecommendationResultSchema` now discriminates strict success and failure envelopes, including the required failure error and empty recommendations. Auth continuation paths reject traversal, encoded traversal, and locale mismatches. The contract fixtures assert the raw input once and cover unsafe locales, auth continuation boundaries, and contradictory recommendation states.

## SURFACE

Command: `npm run build`

Observed: exit 0; Next production compilation completed and 19 static pages were generated.

The changed surface is the typed contract boundary and its build integration. No UI component implementation was changed, so browser interaction is not applicable to this task.

## CLEANUP

Commands: `npm run typecheck`, `npm run lint`, `npm run test:evidence-paths`, `git diff --check`, `shasum -a 256 -c .omo/evidence/bookgolas-web-app-parity/SHA256SUMS`.

Observed: all exit 0. The checksum manifest validated the task evidence files, and no debug statements, temporary fixtures or inspector processes remained.

Plan: .omo/plans/bookgolas-web-app-parity.md
