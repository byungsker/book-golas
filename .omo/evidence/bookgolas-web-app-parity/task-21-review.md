# Task 21 review — atomic reading progress and attempt history

## Scope

Issue #434 only: the localized book detail and reading progress surfaces, atomic progress API response, owner-scoped history, completion handling, retry attempt messaging, stale-write conflict recovery, and negative fixtures.

## Manual code review

- The progress request is strict, validates locale, book ID, page bounds, idempotency key, and reading time, and never accepts a caller-selected owner.
- Production writes use the existing `update_reading_progress` atomic RPC. The route reads owner-scoped history only after the write and returns the book, history, duplicate state, and invalidated paths as one typed response.
- Forward updates require a recorded history event. A history read/write failure returns `history_unavailable`, rolls back the browser's optimistic page, and never renders a saved state.
- Concurrent submits are disabled, duplicate requests replay the same fixture result, and stale expected pages show a conflict with an explicit refetch action. Backward edits update the page without fabricating a history event; total-page writes mark the book completed.
- The detail client consumes the progress event to update status, page, and attempt count atomically with the progress panel. Korean and English copies cover loading, empty, error, unauthorized, consent, quota, offline, completion, retry, and conflict states.
- The production history query verifies the active owned book before selecting history rows. Fixture behavior remains restricted to the existing loopback-only route-fixture boundary.

## Validation

- RED: `task-21-RED-test-progress-ui.log` records the missing acceptance script before implementation.
- GREEN: `npm run test:progress-ui` passed 4 Vitest files and 16 tests; the four issue negative modes passed in `task-21-GREEN-negative-all.log`.
- SURFACE: both issue-defined Chromium commands passed 3 tests each. The completion screenshot is `task-21-bookgolas-web-app-parity.png`.
- CLEANUP: lint, typecheck, build, and `git diff --check` passed. The post-commit full regression passed 38 Vitest files and 250 tests, all 59 parity negatives, BLDS/UI contracts, and the progress suite.

## Limitation

The referenced plan file `.omo/plans/bookgolas-web-app-parity.md` is absent from this clean checkout. The required plan reference remains in the machine-readable contract and PR footer.

Verdict: APPROVE
