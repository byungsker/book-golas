# Task 15 diff review

- Scope: GitHub issue #427 only. The change centralizes the localized consumer session handoff, hardens proxy fail-closed behavior, adds expired/invalid/bootstrap/deleted loopback fixtures, and aligns private route loading/error/unavailable states.
- Return safety: `getConsumerSignInRedirectPath` always serializes `getSafeNextPath` into one `returnTo` parameter. Cross-locale, external, traversal and multi-encoded targets fall back to the locale home route.
- Ownership safety: consumer book reads continue to filter by the verified session user and `deleted_at IS NULL`. Foreign and deleted misses intentionally use the same generic not-found copy, and browser tests assert private title markers and `/rest/v1/books` requests are absent from unauthenticated flows.
- Session lifecycle: proxy auth-provider failures fail closed, expired and invalid sessions redirect once, login reloads the safe target, deep-link logout clears the browser/provider session, and the post-logout deep link is gated again.
- Boundary states: consumer layout exposes `unavailable` for bootstrap failure; book and reading loading boundaries expose `pending`, error boundaries expose `error`, and dark book surfaces apply the BLab dark tokens for readable state copy.
- Localization and privacy: all route copy remains in the existing Korean/English message catalogs. Provider error text, access tokens, private book titles and raw book IDs are not rendered by failure boundaries or logged by this change.
- Scope guard: no native-only capability, billing, admin route, service-role credential or protected BLDS worktree was changed.

Verdict: APPROVE

Plan: .omo/plans/bookgolas-web-app-parity.md
