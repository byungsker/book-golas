# Task 31 review evidence

- Issue: #444
- Parent: #412
- Target: `version/web/1.1.0`
- Feature branch: `codex/feature/web/1.1.0/BOK-444-account-settings`
- Plan footer: `.omo/plans/bookgolas-web-app-parity.md`
- Review result: PASS

The account route derives profile reads and nickname writes from the verified session and applies `eq("id", session.value.userId)`. Avatar uploads derive the object path from that same user ID, validate the file type and size, write to the Web-only private `account-avatars` bucket, and create a signed URL only after the ownership check. The existing native `avatars` bucket remains unchanged.

The client preserves the current profile when an avatar upload fails, never stores the current password, and only calls `supabase.auth.updateUser({ password })` for the current authenticated session. The subscription entry renders the free/disabled state and exposes no purchase, restore, upgrade, customer-center, or billing action.

Both `ko` and `en` copy and locale-preserving legal/account links are present. The browser suite covers loading, empty, error, unauthorized, consent, quota, offline, profile, avatar, theme, language, password, ownership, and disabled subscription states.

Validation evidence:

- RED: `task-31-RED-test-account-settings.log` records the missing acceptance script before implementation.
- GREEN: account contract and Vitest suite passed, with 6 files and 12 tests; all 9 negative fixtures passed.
- SURFACE: full `npm test` passed with 71 files and 363 tests, parity matrix 20/53/8, account Chromium suite 5/5, exact happy lane 2/2, exact failure lane 3/3, typecheck, lint, and build passed.
- CLEANUP: `task-31-CLEANUP.log` records diff, JSON, ownership, billing, and artifact checks.
