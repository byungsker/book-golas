# BLDS React/Next integration evidence

Target-Delivery-Unit: client
Target-Version: 1.1.0
Delivery-Profile: web-release-train

이 증거는 기존 `version/web/1.1.0` 소스에서 수집했으며, `client 1.1.0` 대체
라인의 등록 자료로 이관한다.

## RED

- `npm view @byungsker/blab-design-system@0.2.0` returned 404 because the package is not published.
- A root Git dependency at BLDS commit `10a9016f58b30728f179f1c96b0ed738c40c271c` failed because the package lives under `packages/react`.

## GREEN

- BLDS `packages/react` was built and packed from commit `10a9016f58b30728f179f1c96b0ed738c40c271c`.
- `npm run check` passed in BLDS React: lint, typecheck, 11 tests, package boundary, publish guard, Next App Router consumer build and Chromium fixture.
- Web `npm run test:blab-parity` validates the pinned public package artifact and the Flutter-to-React contract.

## SURFACE

- `npm run test:blab-browser` runs `npx playwright test tests/e2e/blab-parity.spec.ts --project=chromium` and covers ko/en, light/dark token activation, 390x844 and 1440x900, keyboard focus, reduced motion, header refresh plus error retry actions, screen-reader names and error/empty surface presence.
- `npm run test:blab-render` verifies the public BLDS loading, empty, error and retry SSR roles and aria contract.
- `apps/client/docs/blab-native-reference-test.dart` is copied into the pinned BLDS checkout and regenerates the 390x844 Flutter light/dark golden references.
- The browser and Flutter evidence artifacts are written to `apps/client/docs/evidence/bookgolas-web-app-parity/`; `SHA256SUMS` records their digests.

## CLEANUP

- The Web adapter imports only `@byungsker/blab-design-system` public exports and `@byungsker/blab-design-system/styles.css`.
- No BLDS source, private module, business logic, route ownership, billing or provider credential was copied into Web.
