# Bookgolas Product Roadmap

Last updated: 2026-08-05

## Target Delivery Contract

Target-Delivery-Unit: mobile
Target-Version: 1.0.2
Delivery-Profile: mobile-store

Target-Delivery-Unit: web
Target-Version: 1.0.2
Delivery-Profile: web-release-train

Target-Delivery-Unit: backend
Target-Version: 1.0.2
Delivery-Profile: backend-service

## Priority order

Bookgolas follows this release order:

1. Ship the next patch release: **1.0.2**.
2. Prepare and validate the Android / Google Play release.
3. Publish the Android release to Google Play after the test and policy gates pass.

The independently delivered web admin has an approved parallel release train:
**web 1.0.2**. It does not change the mobile 1.0.2 binary scope.

## P0 — 1.0.2 patch release

The existing [1.0.2 release plan](./guides/release-1.0.2-plan.md) remains the
source of truth for the patch scope and release blockers. The patch is not
complete until the outstanding stability, privacy, metadata, and platform
verification items are closed with evidence.

The independently deployed Edge Function boundary is a backend-service
companion delivery line for the same patch. The protected `main` environment,
approved project ref, and manual-dispatch rejection controls are still pending
implementation and evidence in BOK-396; opening this line does not authorize
production execution by itself.

Exit gate:

- iOS and Android behavior is verified for the supported feature matrix.
- The release build is reproducible and signed through the approved release
  path.
- Store metadata, privacy disclosures, review notes, and release evidence match
  the shipped binary.
- Backend-service 1.0.2 remains excluded from production execution until
  BOK-396 records the approved project ref, protected `main`, manual-dispatch
  rejection, a verified 1.0.2 source SHA, and explicit deployment authority.
- byungsker explicitly approves the external release action.

## P1 — Android / Google Play readiness

- Confirm `com.bookgolas.app` as the Android application ID and register it in
  the authorized Google Play account.
- Verify Firebase Android configuration, release keystore ownership, and
  secret-safe CI or local build configuration.
- Produce and inspect a signed Android App Bundle (`.aab`).
- Run Android device and regression checks, including the camera flow called out
  in the 1.0.2 release audit.
- Prepare Google Play store listing, privacy policy, Data safety, content
  declarations, screenshots, and reviewer access instructions.

Readiness gate: no Google Play public release is attempted while package
identity, signing, Android runtime behavior, or policy metadata remains
unverified.

## P2 — Google Play launch

- Upload the signed AAB to internal testing.
- Move to closed testing when the internal smoke test passes.
- Complete any Google Play account-specific tester and production-access
  requirements.
- Submit the production release for review only after the launch packet is
  complete and byungsker gives explicit publication authority.
- Verify the public listing, install, sign-in, core reading flow, analytics,
  support entrypoint, and rollback/hold criteria after approval.

## Parallel track — web 1.0.2 data-informed admin

- Replace direct browser-side operational queries with an authenticated
  server-side aggregate metrics boundary.
- Present the reading growth path from users through book registration,
  reading records, AI Recall, and seven-day active use.
- Keep push operations separate from growth interpretation while exposing
  delivery health and click outcomes as supporting evidence.
- Show metric definitions, data freshness, partial-data states, and
  low-sample warnings without exposing user content or identifiers.
- Preserve loading, empty, stale, authorization, and upstream-error states.

Exit gate:

- The admin can identify the current activation stage and the largest observed
  drop without accessing row-level customer data.
- Missing acquisition, retention, or monetization sources remain explicitly
  unavailable rather than appearing as zero.
- Admin and non-admin authorization checks, lint, build, and browser smoke
  checks pass on the approved web release line.

## Current evidence and unknowns

- iOS release state is connected in the Company Control Plane.
- Google Play public listing is not yet connected or released.
- Android signing readiness, Play Console app registration, and final Android
  runtime evidence require verification during P1.
