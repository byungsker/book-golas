# Task 28 code review

Status: APPROVE

Reviewed the staged diff for issue #438 against `version/web/1.1.0` at base revision `4d19c9d2f423d420ff80bdfbefb45155f94c78ac`.

- The mutation schema is strict, pins policy version 2, and does not accept caller supplied ownership.
- The production route derives the user from `auth.getUser()`, scopes consent and receipt reads by that user, calls the canonical RPC, and reads the provider state back before returning success.
- OpenAI and Google Cloud Vision have separate disclosure snapshots, state cards, policy versions, receipt IDs, and send gates.
- Missing, stale, withdrawn, unknown, unavailable, failed-read, offline, and operational-limit states fail closed. New requests are blocked unless the provider state is `allowed`.
- `401`, `403`, `413`, `429`, `500`, `502`, `503`, and `504` cases retain distinct semantic codes; `provider_timeout` is preserved by adapter normalization.
- Withdrawal changes consent state and does not delete unrelated reading records. The account surface contains no billing CTA for operational quota or provider failures.
- Korean and English copy, route fixtures, contract tests, route tests, negative tests, and Chromium evidence cover the acceptance boundary.

No blocking review findings remain. Live Supabase RPC execution was not available on this host; the production route was exercised with an owner-scoped Supabase mock and the deterministic browser fixture path was exercised end to end.
