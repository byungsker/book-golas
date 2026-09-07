# Task 1 parity checker review remediation

- Issue: #416
- Branch: `codex/feature/web/1.1.0/BOK-416-parity-matrix`
- Base under review: `55b664d4beacb27ec004240f727f3f8a73be641e`
- Plan: `.omo/plans/bookgolas-web-app-parity.md`
- Scope: parity checker, required-entry manifest, frozen ledger, and checker evidence only
- Merge gate: unchanged; no merge to `dev` was performed

## Finding and fix

The checker previously maintained only 11 shell/capability IDs in `web/scripts/parity-matrix.mjs`. Removing the real `review-editor` ledger entry left all remaining fields valid, so both the direct checker and npm command exited `0` while reporting 85 entries.

`web/scripts/parity-required-entry-manifest.mjs` independently maintains all 86 real ledger IDs. The checker now requires exactly 86 manifest IDs, rejects duplicate IDs, requires every manifest ID in the ledger, and rejects every ledger ID absent from the manifest. The deterministic `missing-review-editor` fixture removes the real `review-editor` entry without mutating the document on disk.

The checker now also requires exactly one fenced JSON ledger, verifies every top-level decision lock, and rejects state/error-state values outside the closed vocabulary of 16 states and 60 error states. The frozen ledger records the complete lock values and vocabulary, cites `app/lib/config/feature_flags.dart:2-4` including `defaultValue: false`, and marks the preserved public `/support` route as `blocked-by-evidence`/`blocked` with Task 36 owning stale subscription-copy reconciliation and release QA.

The validated top-level locks are `schemaVersion: 1`, `issue: 416`, `planFooter: Plan: .omo/plans/bookgolas-web-app-parity.md`, `locales: [ko, en]`, `defaultLocale: ko`, `localePrefix: as-needed`, `parityBaseline: online-core`, `fullParityGate: blocked-by-evidence`, and `requiredNativeCapabilities: [iOS widget, Siri/App Shortcuts, native push, camera, share sheet, subscriptions]`.

## RED

Before the new fixture guards existed, the requested fixtures were not covered by the checker and were reported only as unknown fixtures:

```text
$ cd web && node scripts/parity-matrix.mjs --fixture second-json-ledger
Parity matrix FAILED:
- Unknown fixture: second-json-ledger
exit=1

$ cd web && node scripts/parity-matrix.mjs --fixture invalid-top-level-lock
Parity matrix FAILED:
- Unknown fixture: invalid-top-level-lock
exit=1

$ cd web && node scripts/parity-matrix.mjs --fixture invalid-state
Parity matrix FAILED:
- Unknown fixture: invalid-state
exit=1

$ cd web && node scripts/parity-matrix.mjs --fixture invalid-error-state
Parity matrix FAILED:
- Unknown fixture: invalid-error-state
exit=1
```

These RED runs established the missing guard-specific coverage. The fixtures then became deterministic in-memory mutations so they never alter the frozen document.

## GREEN

With the exact-fence, top-level-lock, vocabulary, and manifest guards:

```text
$ cd web && node scripts/parity-matrix.mjs
Parity matrix OK: 86 entries, 18 routes, 10 state entries.
exit=0

$ cd web && node scripts/parity-matrix.mjs --fixture second-json-ledger
Parity matrix FAILED:
- The parity matrix must contain exactly one fenced JSON ledger; found 2.
exit=1

$ cd web && node scripts/parity-matrix.mjs --fixture invalid-top-level-lock
Parity matrix FAILED:
- Top-level decision lock parityBaseline must equal "online-core"; received "full-parity".
exit=1

$ cd web && node scripts/parity-matrix.mjs --fixture invalid-state
Parity matrix FAILED:
- entries[0] has unsupported state "invalid-state"; allowed states are ready, loading, empty, error, unauthorized, consent-required, quota, offline, validation, permission-denied, unsupported, conflict, stale, running, paused, disabled.
exit=1

$ cd web && node scripts/parity-matrix.mjs --fixture invalid-error-state
Parity matrix FAILED:
- entries[0] has unsupported error state "invalid-error-state"; allowed error states are emitted in the actionable failure and documented in the frozen ledger.
exit=1

$ cd web && node scripts/parity-matrix.mjs --fixture missing-review-editor
Parity matrix FAILED:
- Required parity ledger entry is missing: review-editor.
exit=1
```

The invalid-error-state run emits the complete allowed error-state list; the frozen document records the same list. The happy npm command exits `0`, and the npm omission/new-guard commands return the same results:

```text
$ cd web && npm run test:parity-matrix
Parity matrix OK: 86 entries, 18 routes, 10 state entries.
exit=0

$ cd web && npm run test:parity-matrix -- --fixture missing-review-editor
Parity matrix FAILED:
- Required parity ledger entry is missing: review-editor.
exit=1

$ cd web && npm run test:parity-matrix -- --fixture second-json-ledger
Parity matrix FAILED:
- The parity matrix must contain exactly one fenced JSON ledger; found 2.
exit=1

$ cd web && npm run test:parity-matrix -- --fixture invalid-top-level-lock
Parity matrix FAILED:
- Top-level decision lock parityBaseline must equal "online-core"; received "full-parity".
exit=1

$ cd web && npm run test:parity-matrix -- --fixture invalid-state
Parity matrix FAILED:
- entries[0] has unsupported state "invalid-state"; allowed states are ready, loading, empty, error, unauthorized, consent-required, quota, offline, validation, permission-denied, unsupported, conflict, stale, running, paused, disabled.
exit=1

$ cd web && npm run test:parity-matrix -- --fixture invalid-error-state
Parity matrix FAILED:
- entries[0] has unsupported error state "invalid-error-state"; allowed error states are emitted in the actionable failure and documented in the frozen ledger.
exit=1
```

## Regression checks

All prior checker fixtures still fail with exit `1` and retain their intended validation:

| Fixture | Result |
| --- | --- |
| `second-json-ledger` | `The parity matrix must contain exactly one fenced JSON ledger; found 2.` |
| `invalid-top-level-lock` | `Top-level decision lock parityBaseline must equal "online-core"; received "full-parity".` |
| `invalid-state` | `entries[0] has unsupported state "invalid-state"` plus the complete allowed-state list |
| `invalid-error-state` | `entries[0] has unsupported error state "invalid-error-state"` plus the complete allowed-error-state list |
| `missing-disposition` | `entries[0] has no valid disposition.` |
| `duplicate-url` | `entries[1] duplicates canonical URL /{locale}/login from entries[0].` |
| `missing-error-state` | `entries[0] is missing an error-state entry.` |
| `complete-without-owner` | complete-owner, data-owner, and evidence-owner errors |
| `unknown-fixture` | `Unknown fixture: unknown-fixture` |
| missing fixture name | `A fixture name is required after --fixture.` |

The happy npm command exits `0` with 86 entries. An independent read-only comparison, separate from the checker implementation, reports:

```json
{
  "jsonFenceCount": 1,
  "ledgerCount": 86,
  "manifestCount": 86,
  "manifestUnique": 86,
  "missingFromLedger": [],
  "unlistedInManifest": []
}
```

## Manual QA and static checks

The direct and npm commands were run against the actual `web/scripts/parity-matrix.mjs` entrypoint. The happy run returned `0`; every RED fixture and prior failure fixture returned `1` with actionable diagnostics; the actual frozen document remained unchanged by fixtures.

Passed:

- `node --check scripts/parity-matrix.mjs`
- `node --check scripts/parity-required-entry-manifest.mjs`
- independent manifest count/equality check: one JSON fence, 86 ledger IDs, 86 manifest IDs, 86 unique manifest IDs, no missing/unlisted IDs
- independent checker/document vocabulary check: 16 states and 60 error states match exactly; `consent-declined` is present in checker, document, and ledger; invalid fixture values are excluded
- `git diff --check`
- direct and npm happy/fixture commands listed above
- `web` lint: skipped because `web/node_modules` is absent
- checker pure LOC: 232, below the 250-line ceiling

The TypeScript LSP was unavailable in the workspace because its installation had previously been declined; Node syntax checks and runtime checker commands were used instead. No consumer route code, admin/marketing route, plan, issue, target branch, or dev merge gate was changed.

The frozen ledger's support entry now records `browserEquivalent` as the preserved public `/support` route with stale subscription copy deferred to Task 36, `disposition: blocked-by-evidence`, `status: blocked`, `dataOwner: Task 36 subscription-copy reconciliation`, and `evidenceOwner: Task 36 support-copy release QA`.

## Pre-commit history inspection

- Current branch: `codex/feature/web/1.1.0/BOK-416-parity-matrix`
- Current pre-commit HEAD: `55b664d4beacb27ec004240f727f3f8a73be641e`
- Prior Task 1 commit: `55b664d fix(parity): enforce complete consumer ledger coverage`
- `origin/dev`: `09df531e1902092bcd18cd845ee483694fbd027d`
- `git merge-base HEAD origin/dev`: `09df531e1902092bcd18cd845ee483694fbd027d`
- Local branch has no configured upstream; push target will be the existing Task 1 branch ref only.
- No merge, rebase, target-branch update, or `dev` operation was performed.
