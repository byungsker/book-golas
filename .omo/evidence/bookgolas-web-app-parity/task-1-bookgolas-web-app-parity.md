# Task 1 evidence: Bookgolas Web parity matrix

- Issue: #416, `[Bookgolas Web Parity 01] Freeze native-to-Web parity matrix and canonical URL/state ledger`
- Branch: `byungsker/parity-task-01`
- Scope: task 1 artifacts only
- Merge gate: held; this worker did not merge to `dev` or alter production services
- Plan: .omo/plans/bookgolas-web-app-parity.md

## Delivered artifacts

- `web/docs/consumer-parity-matrix.md`
  - Frozen canonical route/state ledger with 86 machine-checked entries.
  - Covers auth, onboarding, five-tab shell, book intake/search/schedule, book detail, records/OCR/mindmap, review editor, calendar, analytics, global/per-book recall, account settings, legal routes, browser states, and native-only capabilities.
  - Explicitly records iOS widgets, Siri/App Shortcuts, native push, camera, share sheet, subscriptions, offline, permission, quota, consent, unauthorized, conflict, stale, loading, empty, and error dispositions.
  - Locks `online-core` as the current baseline and `full-parity` as blocked by offline/sync evidence.
  - Uses the existing `ko`/`en` locale contract and `localePrefix: as-needed`; user IDs are excluded from URLs and book routes require authenticated ownership checks.
- `web/scripts/parity-matrix.mjs`
  - Reads the fenced JSON ledger without external dependencies.
  - Fails on missing fields/dispositions, duplicate IDs or canonical URLs, missing `error` entries, invalid state/parity values, missing owners, and complete entries without data/evidence owners.
  - Supports deterministic failure fixtures for missing disposition, duplicate URL, missing error state, and complete-without-owner.
- `web/package.json`
  - Adds the issue-mandated `test:parity-matrix` command.

## RED -> GREEN -> SURFACE -> CLEANUP

### RED

Before these task 1 artifacts, `web/package.json` had no `test:parity-matrix` script and the required `web/docs/consumer-parity-matrix.md` path did not exist. The acceptance command therefore had no repository-owned ledger or checker to execute.

### GREEN

Exact issue acceptance command:

```text
$ cd web && npm run test:parity-matrix

> web@0.1.0 test:parity-matrix
> node scripts/parity-matrix.mjs

Parity matrix OK: 86 entries, 18 routes, 10 state entries.
```

Exact issue failure command:

```text
$ cd web && npm run test:parity-matrix -- --fixture missing-disposition

> web@0.1.0 test:parity-matrix
> node scripts/parity-matrix.mjs --fixture missing-disposition

Parity matrix FAILED:
- entries[0] has no valid disposition.
```

The failure fixture exited with status `1`; the command was wrapped only to capture and assert the expected non-zero result.

Additional checker branches are available for `duplicate-url`, `missing-error-state`, and `complete-without-owner`; these are deterministic input mutations and do not change the frozen document.

### SURFACE

The ledger is grounded in the approved issue references:

- `app/lib/main.dart:363-712` for the auth wrapper, onboarding gate, five-tab shell, search-mode routing, timer overlay, notification deep links, and locale/theme setup.
- `app/lib/routing/app_router.dart:11-45` for legacy native route behavior, explicitly not as the Web canonical route tree.
- `app/lib/ui/` and `app/lib/data/services/` for the native screens, sheets, modals, actions, provider boundaries, OCR, recall, share, FCM, widgets, and notifications.
- `app/lib/domain/models/` for the data ownership vocabulary.
- `app/metadata/review-notes.md:16-59` for network requirements and the offline evidence boundary.
- `app/lib/config/feature_flags.dart:1-3` for `paidSubscriptionsEnabled = false`.
- `web/src/app/` and `web/src/i18n/routing.ts:3-7` for existing Web surface preservation and the `ko`/`en` routing contract.

### CLEANUP

No implementation route was marked complete. No billing, purchase, restore, subscription enablement, production Supabase operation, or `dev` merge was performed. Existing Web marketing/legal/admin routes remain outside this consumer parity ledger and retain their existing authorization boundary.

## QA handoff and remaining gate

Task 1 is ready for coordinator review and integration-branch promotion. Consumer route implementation, repository read/write/readback, failure isolation, browser/CUA evidence, and offline/full-parity approval remain downstream gates; `dev` merge remains gated on the parent issue's aggregate verification and explicit user approval.

Plan: .omo/plans/bookgolas-web-app-parity.md
