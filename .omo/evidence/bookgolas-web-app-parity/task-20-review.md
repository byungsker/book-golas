# Task 20 review — owned book detail lifecycle

## Scope

Issue #433 only: the localized owned book detail route, status actions, metadata, soft-delete confirmation, typed API response, and private cache invalidation. The worktree keeps the existing #431 lifecycle surface intact.

## Manual code review

- The detail query reads the full canonical book DTO and scopes by the verified session user, book ID, and `deleted_at IS NULL`.
- The action request is strict and does not accept caller-supplied ownership fields. Start, resume, pause, complete, and delete are checked against the native status action matrix before writes.
- Production writes use `getBook`, `updateBook`, and `deleteBook`; delete is a soft-delete. Successful writes revalidate home, library, detail, reading, review, and mind-map paths and return `private, no-store` responses.
- The browser disables concurrent actions, parses the typed response, keeps retryable failures recoverable, and requires an explicit Radix confirmation before delete. Cancel leaves the detail mounted.
- External review/store links are rendered only for HTTPS URLs. Fixture behavior is restricted by the existing loopback-only route fixture boundary.
- Korean and English copies cover status actions, metadata, retry, error, and deletion confirmation.

## Validation

- RED: `task-20-RED-test-book-detail.log` records the missing acceptance script before implementation.
- GREEN: `task-20-GREEN-green.log` and the four negative fixture logs pass.
- SURFACE: both issue-defined Chromium commands pass; the happy flow screenshot is `task-20-bookgolas-web-app-parity.png`.
- CLEANUP: lint, typecheck, build, and `git diff --check` pass in the task worktree.

## Limitation

The referenced plan file `.omo/plans/bookgolas-web-app-parity.md` is absent from this clean checkout. The required plan reference remains in the machine-readable contract and PR footer.

Verdict: APPROVE
