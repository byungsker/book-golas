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

Verdict: `BLOCKED`. This is a staged/local verification record, not a Production parity claim.

- Branch: `codex/feature/web/1.1.0/bookgolas-web-completion`
- Current HEAD: `52e9c1db19b307200acef66eef73b86122b315d8`
- Current HEAD tree: `b9b996cf67558e6253947f46f7ea15065da68f2d`
- Current source-input manifest SHA-256: `943c746660e65643b7629ba4f118573432604bda4c20d6d5166b300dc42afd35`
- Ledger SHA-256: `ff7e1a273843c22697c98b12594da527187b81fcd60d595a74a0ca604885de6e`
- Ownership SHA-256: `7b488289204b3997474d9e8e582bbb272bf1e827a2427957c770ea9d07e778f6`
- Matrix SHA-256: `7bad8d02a213c31b1c0ef1fd5d4d84a327161f655820b1d22a6a1521425e75d1`
- Fixture release manifest SHA-256: `618d32eefd1dffc14a5f23fc244eee3623494ae58f26b2ec86fecf16ae92c8a5`
- Fixture evidence receipt SHA-256: `102ba455df96695124715472f8cfe8b74b16814b1453d927212a0351aa5677a0`
- Repaired Web evidence checksum manifest SHA-256: `db3a74423f784aed7041327ec88b6f3ac7382f2d26b6652abc2e80f4047f58f6`

Fresh local verification passed: `npm test` (`84` files / `424` tests and `57` focused commands), lint (`0` errors / `9` warnings), typecheck, build (`42/42` pages), parity positive, all `72` parity negative fixtures, evidence-path validation, and direct checksum verification. The intentional ledger-checksum mutation exited `1`.

The Task 21 all-browser artifact is reused only as a hash-bound current result: Chromium, Firefox and WebKit each passed `236/236`; the artifact SHA-256 is `051ae025b453bfa23cb0c6ebb8b90fd42c33d51ca39aeed1a74f7cc5402f4dde`, and the Task 22 currentness audit found no browser source, test, script, message, package, Playwright or TypeScript configuration input newer than that artifact.

Production parity remains `0/85` (`0/20` routes, `0/53` overlays, `0/4` deep links, `0/8` capabilities). Staged fixture characterization remains `7/85` (`1/20`, `1/53`, `0/4`, `5/8`). The ledger still contains `12` partial and `66` planned records; these are not relabeled as Production-terminal.

Blocking conditions:

- Hosted Preview verification cannot run because `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `WEB_ALLOWED_ORIGINS` are absent. The fail-closed Preview probe exited `1` and named all four variables.
- The current product implementation is a dirty working-tree snapshot, not an immutable release commit. HEAD therefore cannot truthfully bind the uncommitted source tree as released code.
- The Web 1.1.0 branch/version is policy-valid, but the allowed-path audit is non-zero. `.agents/**`, `.omo/evidence/bookgolas-web-completion/**`, `supabase/config.toml`, `supabase/.temp/**`, and `supabase/.branches/**` lack current Web allow-list coverage. Policy was not changed.

Safe resume: provision isolated hosted Preview values through the release owner's secret store; run the documented hosted CORS/JWT/RLS/email/provider-stub checks; obtain governance authorization for the recorded disallowed paths; create an immutable verified source commit without absorbing unrelated work; regenerate the release manifest and receipt from that commit; then rerun parity, checksums and the final release gate. No deploy, merge, push, publish or hosted mutation was performed here.
