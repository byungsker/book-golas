# #414 final verification

Date: 2026-09-09

## Browser and fixture infrastructure

- `npm run test:e2e -- --list` — PASS: Chromium, Firefox and WebKit projects resolve.
- `npm run test:fixtures` — PASS: isolated User A/User B, books, images and secret-scan negative fixture.
- `npm run test:evidence-paths` — PASS: task and visual evidence manifests are scoped, present and digest-checked.
- `npm run test:e2e -- --project=chromium --grep missing-session` — PASS: missing-session surface fails closed.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm test` — PASS: 27 Vitest tests, parity matrix, 59 negative parity fixtures, BLDS parity/negative/SSR contracts.
- `npm run test:e2e` — PASS: 15 tests across Chromium, Firefox and WebKit covering ko/en light/dark consumer states and missing-session handling.
- `npm run build` — PASS: 19 generated application routes.
- external `PLAYWRIGHT_BASE_URL` — PASS: non-loopback URL rejected; IPv6 loopback accepted.

## Fixture reset

- `npm run test:fixtures:runtime` — PASS on an isolated Tailscale-linked Docker Desktop host at final code commit `0460df44e964b83e6c1d284669c5a55d73b78922`. The run reset the local database, uploaded `cover.png`, and listed/downloaded `book-images/user-a/book-a.png` and `book-images/user-b/book-b.png` through the Storage API with matching 68-byte contents.
- The first real reset exposed a Supabase Storage protection error from direct `storage.objects` deletion; removing that redundant seed statement produced the passing reset above. The current MacBook Docker engine remains unavailable while locked.
- Redacted runtime transcript with exact tested revision, source hashes, reset exit code, and Storage API object verification: `.omo/evidence/bookgolas-web-app-parity/remote-reset-verification.md`.

## Provenance

- Issue: #414
- Branch: `codex/feature/web/1.1.0/BOK-414-browser-fixtures`
- Target: `version/web/1.1.0`
- Tested commit: `0460df44e964b83e6c1d284669c5a55d73b78922`
- Plan: `.omo/plans/bookgolas-web-app-parity.md`
