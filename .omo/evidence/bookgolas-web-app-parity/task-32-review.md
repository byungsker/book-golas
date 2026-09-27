# Task 32 review evidence

- Issue: #445
- Parent: #412
- Target: `version/web/1.1.0`
- Feature branch: `codex/feature/web/1.1.0/BOK-445-web-push`
- Plan footer: `.omo/plans/bookgolas-web-app-parity.md`
- Review result: PASS

The Web Push route derives subscription and notification settings ownership from the verified session, stores browser subscriptions in a dedicated `web_push_subscriptions` table, and keeps the existing native FCM token path separate. The public service worker accepts only a UUID book destination on the same origin, preserves the locale, and leaves final book ownership enforcement to the authenticated Web route.

The client requests browser permission only from an explicit enable action, provides recoverable denied and unsupported states, persists the native notification preference set for both locales, and exposes an in-app fallback. The registration response omits subscription keys and labels hosted delivery as `registration-only` because hosted Web Push delivery has not been verified.

Validation evidence:

- RED: `task-32-RED-test-web-push.log` records the missing acceptance command before implementation.
- GREEN: `npm run test:web-push` passed 5 Vitest files and 11 tests; `npm run test:web-push:negative` passed all 9 negative fixtures.
- SURFACE: the exact happy Chromium lane passed 1/1, the exact denied/unsupported/foreign lane passed 3/3, full `npm test` passed 76 files and 374 tests, and typecheck, lint and build passed.
- CLEANUP: `task-32-CLEANUP.log` records the diff, contract, ownership, localization, browser artifact and secret-marker checks.

The hosted notification delivery provider remains an explicit product boundary. The matrix and UI do not claim end-to-end Web Push delivery until that provider can be verified.
