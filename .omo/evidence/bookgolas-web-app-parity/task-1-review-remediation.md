# Task 1 parity checker review remediation

- Issue: #416
- Branch: `codex/feature/web/1.1.0/BOK-416-parity-matrix`
- Base under review: `b5cee44e68a7381a66bdc6dff16aa2e631c558e0`
- Plan: `.omo/plans/bookgolas-web-app-parity.md`
- Scope: parity checker, required-entry manifest, and checker evidence only
- Merge gate: unchanged; no merge to `dev` was performed

## Finding and fix

The checker previously maintained only 11 shell/capability IDs in `web/scripts/parity-matrix.mjs`. Removing the real `review-editor` ledger entry left all remaining fields valid, so both the direct checker and npm command exited `0` while reporting 85 entries.

`web/scripts/parity-required-entry-manifest.mjs` now independently maintains all 86 real ledger IDs. The checker validates that the manifest has no duplicate IDs, every manifest ID is present in the ledger, and every ledger ID is represented by the manifest. The deterministic `missing-review-editor` fixture removes the real `review-editor` entry without mutating the document on disk.

## RED

Before the complete manifest was added, the exact real-entry omission was exercised by temporarily removing the `review-editor` object from the fenced ledger:

```text
$ cd web && node scripts/parity-matrix.mjs
Parity matrix OK: 85 entries, 18 routes, 10 state entries.
exit=0

$ cd web && npm run test:parity-matrix
Parity matrix OK: 85 entries, 18 routes, 10 state entries.
exit=0
```

After restoring the ledger and adding only the deterministic fixture, the failing-first fixture still reproduced the missing-inventory defect:

```text
$ cd web && node scripts/parity-matrix.mjs --fixture missing-review-editor
Parity matrix OK: 85 entries, 18 routes, 10 state entries.
fixture_red_exit=0
```

## GREEN

With the complete manifest and omission guard:

```text
$ cd web && node scripts/parity-matrix.mjs
Parity matrix OK: 86 entries, 18 routes, 10 state entries.
green_direct_happy_exit=0

$ cd web && node scripts/parity-matrix.mjs --fixture missing-review-editor
Parity matrix FAILED:
- Required parity ledger entry is missing: review-editor.
green_direct_omission_exit=1

$ cd web && npm run test:parity-matrix -- --fixture missing-review-editor
Parity matrix FAILED:
- Required parity ledger entry is missing: review-editor.
green_npm_omission_exit=1
```

## Regression checks

All prior checker fixtures still fail with exit `1` and retain their intended validation:

| Fixture | Result |
| --- | --- |
| `missing-disposition` | `entries[0] has no valid disposition.` |
| `duplicate-url` | `entries[1] duplicates canonical URL /{locale}/login from entries[0].` |
| `missing-error-state` | `entries[0] is missing an error-state entry.` |
| `complete-without-owner` | complete-owner, data-owner, and evidence-owner errors |
| `unknown-fixture` | `Unknown fixture: unknown-fixture` |
| missing fixture name | `A fixture name is required after --fixture.` |

The happy npm command exits `0` with 86 entries. An independent read-only comparison reports:

```json
{
  "ledgerCount": 86,
  "manifestCount": 86,
  "manifestUnique": 86,
  "missingFromLedger": [],
  "unlistedInManifest": []
}
```

## Manual QA and static checks

The happy command and `missing-review-editor` fixture were run in a fresh tmux PTY. The happy run returned `0`; the omission run returned `1` with the actionable missing ID; the tmux session was removed afterward.

Passed:

- `node --check scripts/parity-matrix.mjs`
- `node --check scripts/parity-required-entry-manifest.mjs`
- manifest count/uniqueness check: 86/86
- `git diff --check`
- direct and npm happy/fixture commands listed above

The TypeScript LSP was unavailable in the workspace because its installation had previously been declined; Node syntax checks and runtime checker commands were used instead. Web dependencies are not installed in this worktree, so no unrelated web build or lint command was required for this script-only remediation.

No consumer route code, admin/marketing route, plan, issue, target branch, or dev merge gate was changed.

## Pre-commit history inspection

- Current branch: `codex/feature/web/1.1.0/BOK-416-parity-matrix`
- Current pre-commit HEAD: `b5cee44e68a7381a66bdc6dff16aa2e631c558e0`
- Prior Task 1 commit: `b5cee44 docs(parity): lock native consumer web matrix`
- `origin/dev`: `09df531e1902092bcd18cd845ee483694fbd027d`
- `git merge-base HEAD origin/dev`: `09df531e1902092bcd18cd845ee483694fbd027d`
- Local branch has no configured upstream; push target will be the existing Task 1 branch ref only.
- No merge, rebase, target-branch update, or `dev` operation was performed.
