# Task 22 review — browser timer and reading sessions

## Scope

Issue #436 only: the localized reading timer control, floating timer bar, browser-local session state, typed finish API, reading-session persistence, total-reading-time propagation, logout cleanup, and threshold/replay/ownership fixtures.

## Manual code review

- The finish request is strict, localized, date-ordered, bounded by the transport ceiling, and rejects caller-supplied identity fields. Production reads and writes derive the user from `resolveProductSession()` and scope books and sessions by that verified user plus active book rows.
- Start, pause and resume stay browser-local in a validated `localStorage` record. Reload restores the active book and accumulated segments; the provider closes a session at the eight-hour ceiling, while the API caps persisted duration at 28,800 seconds.
- Stops shorter than 30 seconds return a typed discarded result without inserting a session. The session UUID is the idempotency key, duplicate replays are harmless, and a failed or offline request keeps the timer available for retry.
- Successful sessions update `books.total_reading_seconds`, return the updated book and total in one private no-store response, invalidate localized consumer views, and publish a browser event consumed by book detail. Logout clears the local record through both Supabase `SIGNED_OUT` and the explicit browser logout event.
- The control and floating bar use the shared BLDS consumer button/card primitives. Korean and English strings cover idle, active, saving, discarded, and typed failure feedback. Loopback-only fixtures cover short, over-limit, duplicate, offline, unauthorized, foreign and deleted boundaries.
- The existing parity negative harness was corrected so its alias fixtures use unchanged, role-valid evidence paths; the full 59-fixture suite now exercises the intended independent-evidence failure again.

## Validation

- RED: `task-22-RED-test-timer.log` records the missing `test:timer` script before implementation.
- GREEN: `npm run test:timer` passed 4 Vitest files and 14 tests; the four declared negative modes passed in `task-22-GREEN-negative-all.log`.
- SURFACE: the issue-defined Chromium commands passed 3 tests each. The happy run covered start, pause, resume, stop, refresh restoration, the eight-hour cap and duplicate replay. The failure run covered minimum discard, duplicate stop and logout cleanup. The resulting screenshot is `task-22-bookgolas-web-app-parity.png`.
- CLEANUP: lint, typecheck, build and `git diff --check` passed. The full regression passed 42 Vitest files and 264 tests, 20 routes/53 overlays/8 capabilities, all 59 parity negatives, BLDS/UI contracts, progress contracts and timer contracts.

## Limitation

The referenced plan file `.omo/plans/bookgolas-web-app-parity.md` is absent from this clean checkout. The required plan reference remains in the machine-readable contract and PR footer.

Verdict: APPROVE
