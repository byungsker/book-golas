# Task 16 review

- Scope is limited to issue #429: Home and reading-list status surfaces, their consumer query boundary, translations, contract script, negative fixture and browser evidence.
- Native parity reviewed against the five BookListScreen tabs, reading/completed/planned/will_retry filtering, progress cards, target dates, planned start dates, loading skeleton, empty states, retry and refresh behavior.
- The production route still obtains data through `fetchOwnedBooks`; seeded rows are reachable only through the loopback route fixture and the deleted row is removed before parsing.
- The collection query remains authenticated-user scoped, excludes `deleted_at`, and adds a deterministic id tie-breaker after `updated_at`.
- The all view intentionally presents the native current-reading section followed by the complete status list. The focused browser test asserts each effective status and absence of the deleted marker.
- `git diff --check`, contract/negative checks, focused Vitest, exact Chromium happy/failure commands, typecheck and lint passed.
