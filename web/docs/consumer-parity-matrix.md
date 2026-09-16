# Bookgolas Web 1.1.0 Consumer Parity Matrix

Target-Delivery-Unit: web
Target-Version: 1.1.0
Delivery-Profile: web-release-train

## Purpose

This document freezes the native-to-Web contract for the authenticated Bookgolas consumer product. The native Flutter app and the cross-platform BLab contract are the reference. The marketing site, legal pages and admin console are separate surfaces and are not evidence of consumer parity.

The machine-checkable source of truth is consumer-parity-ledger.json. Every route, overlay and capability entry has a native source, one Web disposition, a current or planned Web target, all required state dispositions, user-facing actions and an owning issue. The independent native expected-surface inventory in native-consumer-surface-inventory.json makes omitted native routes, overlays and actions fail validation. The inventory declares two evidence tiers: every native action is structurally pinned by the independent requiredNativeActionIds baseline, while source-content assertions intentionally cover the critical representative actions listed by requiredNativeActionAssertions. The checker does not claim source-content provenance for every action in this initial freeze; adding an action to that claim requires an explicit native source assertion.

The ledger records the current repository state, not a claim that planned routes already work. Planned Web targets use explicit descriptors until a tracked implementation file exists; a repository-looking target must resolve to a tracked file. A complete status requires independent data and browser evidence, with browser artifacts restricted to tracked browser-result locations; no entry is marked complete in this initial freeze. Deep-link mappings are machine-checked in the ledger as well as summarized below.

## Delivery dependencies

- #416 freezes this native-to-Web parity matrix and owns the evidence contract.
- #453 extends BLab Design System to a public React/Next.js package and is required before shared Web primitives are implemented.
- #421 owns Bookgolas Web shared UI primitives after the BLDS React/Next.js contract is available.
- BLDS issue #12 is the cross-repository package implementation dependency.

## Parity rule

For every supported feature, Web must match the app in:

- visual language, BLab tokens, typography, spacing, surfaces and component anatomy;
- information hierarchy, localized copy and navigation semantics;
- actions, validation, state transitions, loading, empty, error, retry, consent and quota outcomes where the native surface exposes them;
- keyboard, screen-reader, focus, reduced-motion and pointer behavior;
- user ownership, persistence, deep-link recovery and safe unauthorized handling.

Responsive Web geometry may adapt to viewport constraints. It may not introduce a different product behavior, information hierarchy, state model or feature promise. Every intentional difference must be recorded as a parity-matrix exception before implementation.

Web 1.1.0 uses the online-core policy. Offline behavior is either explicitly bounded and tested or shown as unavailable. Native-only capabilities are listed below instead of being silently dropped.

## Canonical consumer routes

All consumer routes support the ko and en locale contract. Existing Web files are marked partial until complete native behavior is verified.

| Native surface | Canonical Web URL | Current Web evidence | Status | Owner |
| --- | --- | --- | --- | --- |
| Sign in | /{locale}/auth/sign-in | web/src/app/[locale]/(auth)/auth/sign-in/page.tsx | partial | #423 |
| Account creation | /{locale}/auth/sign-up | web/src/app/[locale]/(auth)/auth/sign-up/page.tsx | partial | #423 |
| Password recovery | /{locale}/auth/reset-password | web/src/app/[locale]/(auth)/auth/reset-password/page.tsx | partial | #423 |
| Terms WebView | /{locale}/terms | web/src/app/[locale]/terms/page.tsx | partial | #444 |
| Announcements WebView | /{locale}/announcements | not implemented | planned | #444 |
| Onboarding | /{locale}/onboarding | not implemented | planned | #426 |
| Home and reading status | /{locale}/home | web/src/app/[locale]/(consumer)/home/page.tsx | partial | #429 |
| My Library | /{locale}/library | not implemented | planned | #430 |
| Reading statistics | /{locale}/stats | not implemented | planned | #440 |
| Calendar | /{locale}/calendar | not implemented | planned | #439 |
| My Page and settings | /{locale}/account | not implemented | planned | #444 |
| Native book-list route | /{locale}/book-list | not implemented | planned | #430 |
| Search and add book | /{locale}/books/new | not implemented | planned | #428/#431 |
| Book detail | /{locale}/books/{bookId} | web/src/app/[locale]/(consumer)/books/[bookId]/page.tsx | partial | #433 |
| Reading progress | /{locale}/reading/{bookId} | web/src/app/[locale]/(consumer)/reading/[bookId]/page.tsx | partial | #434 |
| Book review editor | /{locale}/books/{bookId}/review | not implemented | planned | #437 |
| Note-structure mind map | /{locale}/books/{bookId}/mind-map | not implemented | planned | #442 |
| Barcode scanner | /{locale}/books/scan | not implemented | planned browser equivalent | #428 |
| Subscription entry | /{locale}/subscription | intentionally disabled | disabled | #444 |
| Privacy and consent | /{locale}/privacy | web/src/app/[locale]/privacy/page.tsx | partial | #444 |

## Shared shell and action contract

The native MainScreen has five persistent tabs: Home, My Library, Reading Statistics, Calendar and My Page. Repeated selection of Home cycles its status view; repeated selection of Reading Statistics cycles its section. The bottom-bar search affordance opens book search or AI Recall search depending on the selected mode.

| Native behavior | Web requirement | Owning issue |
| --- | --- | --- |
| Five-tab navigation | Preserve tab order, selected state, keyboard order and deep-linkable destination | #425 |
| Home status cycle | Preserve reading, planned, completed and paused state surfaces | #429 |
| Statistics section cycle | Preserve overview, analysis and activity sections plus annual, monthly, weekly, custom-range selection, period navigation and analysis-section navigation | #440 |
| Book status model | Preserve planned, reading, completed and will_retry semantics | #429/#431 |
| My Library discovery | Preserve reading/review search, year filtering, grouped-record expansion and record-type filtering | #430/#441 |
| Search mode menu | Preserve book search and AI record search as separate actions | #428/#441 |
| Announcements | Preserve the localized My Page document and empty state with a return path to account | #444 |
| Locale | Every consumer state and action has Korean and English copy | #422 |
| Auth recovery | Web-owned return-path security contract preserves locale and validates the next path before returning; it is not claimed as a native deep link | #427 |

The ledger contains the action-level contract for each screen and overlay, including destructive confirmation, cancel, retry, permission, consent and quota outcomes where applicable. It does not invent a consent step for native surfaces that do not expose one.

## Overlay and sheet inventory

The native app uses sheets, dialogs, context menus and full-screen overlays heavily. The Web implementation may use an accessible dialog, sheet or route-preserving overlay, but it must keep the same action result and state transitions.

The complete inventory is in the ledger. It includes:

- navigation and discovery: search mode menu, Global Recall, book Recall, record detail, source detail, bookstore selection, recommendation actions and reading-book selection;
- statistics and calendar: day detail, reading goal, period navigation and custom date range;
- book and reading flows: reading management, pause/delete confirmations, book info, full title, page update, reading timer, daily goal, daily target, target date, planned-book editor, completion and review prompt;
- review and media outcomes: memorable-page sort menu and review AI-draft replacement confirmation;
- book detail metadata: external review-link editor, mind-map leaf detail and mind-map cluster detail;
- private media and OCR: image source, image replacement, memorable-page capture, existing image, extracted text, full text, OCR quota and full-screen image viewer;
- account and feedback: language-change confirmation, review exit/save confirmations, password change, account deletion, notification time picker, disabled Pro state and floating timer;
- shared BLDS primitives: context menu and search overlay.

Every listed overlay has an action owner and one of the state profiles in the ledger. There are no anonymous modal or sheet entries.

Reading Statistics also records the quota-gated AI insight generate and retry actions. Native review and mind-map flows do not expose a separate AI consent step; only the review replacement confirmation shown when existing text would be overwritten is preserved.

## Native-only and browser-equivalent capabilities

| Capability | Native evidence | Web disposition | Status | Owner |
| --- | --- | --- | --- | --- |
| iOS home widgets | WidgetDataService, HomeWidget and widget deep links | No Web OS widget; ordinary HTTPS deep links remain supported | unavailable | #445 |
| Siri and App Shortcuts | BookgolasShortcuts.swift, AppDelegate.swift and Info.plist implement three native shortcuts | No Web OS shortcut; ordinary HTTPS destinations remain supported | unavailable | #416 |
| FCM and local notifications | fcm_service.dart and notification settings | Browser Push API registration, permission recovery and account preferences; hosted delivery is unverified | registration-only / delivery unverified | #445 |
| Camera, barcode, document scan and OCR | scanner, document scan and OCR utilities | Browser permission plus input/upload fallback | planned equivalent | #428/#435 |
| Native share sheet | BookShareService and share cards | Web Share API plus clipboard/download fallback | planned equivalent | #443 |
| RevenueCat subscriptions | Native service exists; paid flag defaults off | Purchase, restore, upgrade and customer center disabled | disabled | #444 |
| Offline mutation | Local cache/draft and widget behavior only | Online-only boundary with read-only feedback, observable reconnect and no silent queue | online-only boundary | #447 |
| Native deep links | bookgolas://book/... parser | Locale-preserving HTTPS routes and safe next paths | partial equivalent | #427 |

## Reading data export (#443)

The export contract is machine-checkable in `web/docs/export-contract.json`, with negative cases in `web/scripts/fixtures/export-negative.json` and the acceptance command exposed as `npm run test:export`. The account action in `web/src/components/consumer/reading-data-export-client.tsx` at `/{locale}/account` sends a selected UTC calendar year in JSON or CSV format to the authenticated account email. The server derives ownership from the verified session, rejects caller identity fields and another account email, and scopes books plus every child graph source to that owner and selected year.

The supported graph is `books`, `reading_progress_history`, `reading_sessions`, `reading_content_embeddings` for text, notes and highlights, `book_images` for images and OCR text, `reading_goals`, `recall_search_history`, `note_structures`, `reading_insights_memory`, `book_recommendations` and `ai_recall_usage`. The obsolete `memos` table is not queried. Korean and English account copy exposes loading, empty, error, unauthorized, consent, quota and offline outcomes; provider and download failures keep a retry action. The current Web contract reports that an email was sent only after the provider call succeeds and leaves `downloadUrl` null because a hosted download surface is not verified.

The export surface records native-only iOS widgets, Siri/App Shortcuts, native push, camera capture, share sheet and subscription controls in the contract. Those capabilities remain unavailable or owned by their separate Web parity issue and are not silently presented as export behavior.

## State profiles

Every ledger entry points to a profile. All profiles explicitly define:

| State | Required question |
| --- | --- |
| Loading | What progress or skeleton is shown, and how are duplicate actions prevented? |
| Empty | What does the user see when there is no data or input? |
| Error | What localized retry or safe fallback is available? |
| Unauthorized | How does the surface return to sign-in without exposing data? |
| Consent | Which provider, AI, notification or browser permission is required? |
| Quota | What is disabled or explained without Web billing? |
| Offline | Which behavior is proven, and where is the online-core boundary shown? |

The exact profile text is in the ledger. A missing profile key is a validation failure.

## Canonical deep-link mapping

| Native link | Canonical Web destination |
| --- | --- |
| bookgolas://book/search | /{locale}/books/new |
| bookgolas://book/detail/{bookId} | /{locale}/books/{bookId} |
| bookgolas://book/record/{bookId} | /{locale}/books/{bookId}?tab=history |
| bookgolas://book/scan/{bookId} | /{locale}/books/{bookId}?scan=1 |

The auth callback `next` value is a Web-owned return-path security contract covered by #427 and `getSafeNextPath`; it is intentionally not listed as a native deep-link mapping because the Flutter source does not implement a native `next` route contract.

## Offline boundary (#447)

Web 1.1.0 deliberately keeps the consumer core online-only. When the browser reports offline, the shared consumer shell exposes a localized read-only status with `data-queue-enabled="false"`; progress, book metadata/status, notes/highlights, timers, images/OCR, AI, Web Push and account writes are rejected for the offline attempt and remain available for an explicit retry after reconnect. The browser emits `bookgolas:online-reconnected` and renders the reconnect state so retry is observable. The review editor is the only proven local draft exception; its unfinished text stays on the device and is never replayed as a hidden mutation queue.

State contract: loading, empty, error, unauthorized, consent, quota, offline.

The machine-checkable contract is `web/docs/offline-sync-contract.json`, its negative fixtures are `web/scripts/fixtures/offline-sync-negative.json`, and the acceptance command is `npm run test:offline-sync`. The browser scenarios are in `web/tests/e2e/offline-sync.spec.ts`. The contract records loading, empty, error, unauthorized, consent, quota, offline, reconnect, conflict, duplicate and unsupported-mutation states, plus the iOS widget, Siri/App Shortcuts, native push, camera/OCR, share sheet and subscription boundaries.

## Validation

From web/:

~~~bash
npm run test:parity-matrix
npm run test:parity-matrix -- --assert-fixtures
npm run test:parity-matrix -- --fixture missing-disposition
npm run test:parity-matrix -- --fixture duplicate-canonical-url
npm run test:parity-matrix -- --fixture missing-error-state
npm run test:parity-matrix -- --fixture missing-required-state
npm run test:parity-matrix -- --fixture complete-without-evidence
npm run test:parity-matrix -- --fixture complete-with-invalid-evidence
npm run test:parity-matrix -- --fixture invalid-native-boundary
npm run test:parity-matrix -- --fixture missing-deep-link
npm run test:parity-matrix -- --fixture invalid-deep-link-target
npm run test:parity-matrix -- --fixture invalid-deep-link-source
npm run test:parity-matrix -- --fixture invalid-deep-link-assertion-source
npm run test:parity-matrix -- --fixture missing-native-overlay
npm run test:parity-matrix -- --fixture missing-native-action
npm run test:parity-matrix -- --fixture complete-with-fabricated-evidence
npm run test:parity-matrix -- --fixture invalid-billing-route
npm run test:parity-matrix -- --fixture invalid-billing-overlay
npm run test:parity-matrix -- --fixture invalid-billing-claim
npm run test:parity-matrix -- --fixture invalid-disabled-current
npm run test:parity-matrix -- --fixture invalid-disabled-current-type
npm run test:parity-matrix -- --fixture invalid-disabled-target-type
npm run test:parity-matrix -- --fixture invalid-disabled-evidence-type
npm run test:parity-matrix -- --fixture complete-with-aliased-evidence
npm run test:parity-matrix -- --fixture unsafe-source-reference
npm run test:parity-matrix -- --fixture invalid-native-source
npm run test:parity-matrix -- --fixture invalid-native-source-role
npm run test:parity-matrix -- --fixture invalid-directory-reference
npm run test:parity-matrix -- --fixture invalid-action-assertion
npm run test:parity-matrix -- --fixture unsafe-evidence-source
npm run test:parity-matrix -- --fixture missing-required-native-surface
npm run test:parity-matrix -- --fixture missing-required-native-action
npm run test:parity-matrix -- --fixture invalid-web-current-role
npm run test:parity-matrix -- --fixture invalid-web-target-role
npm run test:parity-matrix -- --fixture complete-with-self-authored-evidence
npm run test:parity-matrix -- --fixture complete-with-unit-test-browser-evidence
npm run test:parity-matrix -- --fixture invalid-web-target
npm run test:parity-matrix -- --fixture invalid-web-target-missing-path
npm run test:parity-matrix -- --fixture invalid-web-target-directory
npm run test:parity-matrix -- --fixture invalid-web-target-scheme
npm run test:parity-matrix -- --fixture invalid-web-target-data
npm run test:parity-matrix -- --fixture invalid-web-target-mailto
npm run test:parity-matrix -- --fixture invalid-web-target-whitespace
npm run test:parity-matrix -- --fixture invalid-web-target-encoded-scheme
npm run test:parity-matrix -- --fixture invalid-web-target-encoded-network-path
npm run test:parity-matrix -- --fixture invalid-web-target-backslash
npm run test:parity-matrix -- --fixture invalid-source-inventory
npm run test:parity-matrix -- --fixture extra-native-surface
npm run test:parity-matrix -- --fixture extra-native-action
npm run test:parity-matrix -- --fixture invalid-canonical-path
npm run test:parity-matrix -- --fixture invalid-canonical-path-double-encoded
npm run test:parity-matrix -- --fixture invalid-canonical-path-encoded-duplicate
npm run test:parity-matrix -- --fixture invalid-canonical-path-double-encoded-duplicate
npm run test:parity-matrix -- --fixture invalid-native-assertion-policy
npm run test:parity-matrix -- --fixture complete-with-cross-role-alias
npm run test:parity-matrix -- --fixture missing-action-assertion
~~~

The first command must exit 0. Every fixture command must fail, proving the checker rejects missing dispositions, duplicate canonical URLs including encoded-equivalent paths, missing error-state entries, complete status without independent data/browser evidence, fabricated or alias-based evidence, unsafe or cross-role source paths, directory references where files are required, URI-scheme, protocol-relative, encoded or unsafe Web targets, missing Web target files or directories, invalid native-only boundaries, wrong or unallowlisted deep links, untrusted deep-link assertion sources, omitted or extra native surfaces/actions, invalid evidence-tier policy and accidental Web billing activation. Complete evidence is bound to the exact current Git commit, tracked runtime files and independent repository-contained source and artifact paths. The checker pins all required route, overlay, capability and action IDs, plus 4 native deep-link IDs, independently of the JSON inventory, then checks native source anchors for the critical representative actions and links. Structural action completeness and source-content assertion coverage are separate explicit policy tiers in the inventory. Deep-link assertions additionally require an `app/` source declared by their matching ledger link. `npm test` runs both the positive checker and the complete negative-fixture suite so the ledger cannot bypass the Web quality gate. The checker further rejects missing actions, missing evidence owners, missing deep links and incomplete native-only capability coverage.

## Evidence sources

- Native bootstrap and five-tab shell: app/lib/main.dart
- Native route constants: app/lib/routing/app_router.dart
- Native screens, tabs, sheets and dialogs: app/lib/ui/
- Native models and status values: app/lib/domain/models/
- Native provider, notification, widget and deep-link behavior: app/lib/data/services/
- Native iOS widgets and App Shortcuts: app/ios/BookgolasWidget/BookgolasWidget.swift, app/ios/Runner/BookgolasShortcuts.swift, app/ios/Runner/AppDelegate.swift, app/ios/Runner/Info.plist
- Native feature flags: app/lib/config/feature_flags.dart
- Native localization contract: app/lib/l10n/app_ko.arb and app/lib/l10n/app_en.arb
- Existing Web routes and states: web/src/app/
- Existing Web consumer adapters: web/src/components/consumer/ and web/src/lib/consumer/
- BLDS public contract: blab_design_system repository and BLDS issue 12
- Independent native expected-surface inventory: web/docs/native-consumer-surface-inventory.json

Plan: .omo/plans/bookgolas-web-app-parity.md
