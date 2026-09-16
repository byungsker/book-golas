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
