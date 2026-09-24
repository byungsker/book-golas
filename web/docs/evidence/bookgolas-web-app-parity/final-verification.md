# #453 final verification

Date: 2026-09-09

## Web

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS: 27 Vitest tests, parity matrix, negative fixtures, BLDS parity, negative adapter fixture, SSR contract
- `npm run build` — PASS: 19 generated application routes
- `npm run test:blab-browser` — PASS: 4 Chromium cases covering ko/en, light/dark `prefers-color-scheme`, 390x844/1440x900, keyboard focus, reduced motion, text-field labels, header refresh and error retry actions

## BLDS

- `npm run check` in `packages/react` — PASS
- `flutter analyze` — PASS
- `flutter test` — PASS
- copied `web/docs/blab-native-reference-test.dart` into the pinned checkout and ran `flutter test --update-goldens` — PASS: light/dark 390x844 references

## Provenance

- BLDS source commit: `10a9016f58b30728f179f1c96b0ed738c40c271c`
- Web package: `@byungsker/blab-design-system@0.2.0`
- Tarball SHA-256: `4a3508b4e01de95c0e90269b9cc891bafcba51a05240ecef871b6295f378bd7a`
- Screenshot checksums: `SHA256SUMS`

Headed macOS inspection was unavailable because the host session was locked; Chromium headless surface verification and Flutter golden rendering were available and passed.

## Task 22 release-evidence closure — 2026-09-24

Verdict: `DONECLAIM` for exact-SHA local/staged evidence closure only. Task 22 Production and release acceptance remain `BLOCKED`; this record makes no hosted or Production parity claim.

### Exact source identity

- Branch: `codex/feature/web/1.1.0/bookgolas-web-completion`
- Verified source commit: `de8ba1e3b46df5f25693c42712e8d8908308fb23`
- Verified source tree: `3f3ec1b1b7142de36cd6a2260aed6156b213f830`
- Source commit subject: `test(parity): update production claim fixture rejection`
- Parent implementation commit: `e463a614a624851a36cb9cdee4439cdf279057b5`
- Evidence-only closure: this document and its checksum manifest may be committed after the verified source; that follow-up does not change the verified source tree or promote it.
- `productionParityClaimed=false`

### Current verification

| Scenario | Invocation | Result |
| --- | --- | --- |
| Unit and focused contracts | `cd web && npm test` | PASS, exit `0`; Vitest `84/84` files and `424/424` tests; `57` focused commands with the one declared intentional failure handled by the status-aware aggregate |
| Lint | `cd web && npm run lint` | PASS, exit `0`; `0` errors and `9` warnings |
| TypeScript | `cd web && npm run typecheck` | PASS, exit `0`; no diagnostics |
| Build | `cd web && npm run build` | PASS, exit `0`; compile and TypeScript passed; `42/42` static pages generated |
| Staged parity | `cd web && npm run test:parity-matrix` | PASS, exit `0`; output explicitly says `not a production release claim` |
| All parity negatives | `cd web && npm run test:parity-matrix:negative` | PASS, exit `0`; `72/72` expected rejections observed |
| Intentional checksum mutation | `cd web && node scripts/test-parity-matrix.mjs --fixture ledger-checksum-mismatch` | PASS, expected exit `1`; ledger SHA mismatch was rejected |
| Evidence paths | `cd web && npm run test:evidence-paths` | PASS, exit `0`; repository-relative, scoped, hashed, present evidence contract verified |
| Web evidence checksums | `shasum -a 256 -c web/docs/evidence/bookgolas-web-app-parity/SHA256SUMS` | PASS, exit `0`; every listed committed evidence file verified |
| Preview fail-closed probe | `cd web && env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY -u SUPABASE_SERVICE_ROLE_KEY -u WEB_ALLOWED_ORIGINS npm run test:release-config -- --environment preview` | PASS as an adversarial boundary, expected exit `1`; all four missing names reported without values |

Chromium, Firefox, and WebKit are retained from the Task 21 all-browser run at `236/236` each. Its log SHA-256 is `051ae025b453bfa23cb0c6ebb8b90fd42c33d51ca39aeed1a74f7cc5402f4dde`. Currentness is proven by the exact commit delta: `e463a614..de8ba1e3` changes only `web/scripts/test-parity-matrix.mjs`; no `web/src`, `web/tests`, messages, Playwright configuration, browser runner, or package configuration changed, and the parity validator is not imported by the browser surface. This is reuse of unchanged browser evidence, not a new hosted run.

### Counters and boundaries

- Production parity: `0/85` — routes `0/20`, overlays `0/53`, deep links `0/4`, capabilities `0/8`.
- Staged fixture characterization: `7/85` — routes `1/20`, overlays `1/53`, deep links `0/4`, capabilities `5/8`.
- Ledger statuses: disabled `3`, online-only `1`, partial `12`, planned `66`, registration-only `1`, unavailable `2`.
- The staged manifest and receipt remain `fixture_only=true`. They are not hosted or Production evidence.
- iOS widgets and Siri/App Shortcuts remain unavailable; subscriptions remain disabled; native push remains registration-only; offline remains online-only.

### Release blockers

- Hosted Preview verification is unavailable because `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `WEB_ALLOWED_ORIGINS` are absent. No values were invented.
- Production remains unverified at `0/85`; the ledger retains `12` partial and `66` planned records.
- Web `1.1.0` has no immutable promotion-source SHA in `.byungskerlab/release-lines.json`.
- Task-local evidence under `.omo/evidence/bookgolas-web-completion/**` is outside the committed Web allow-list and therefore remains uncommitted operational evidence.

No deploy, push, merge, publish, Preview mutation, Production mutation, policy broadening, continuity edit, or hosted-system action was performed. Safe resume requires isolated Preview values, tracked hosted evidence for every promoted record, an immutable authorized promotion source, and a fresh release gate. Until then Task 22 Production/release acceptance remains `BLOCKED`.
