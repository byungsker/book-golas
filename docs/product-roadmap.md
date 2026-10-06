# Bookgolas Product Roadmap

Last updated: 2026-08-21

## Target Delivery Contract

Target-Delivery-Unit: mobile
Target-Version: 1.0.2
Delivery-Profile: mobile-store

Target-Delivery-Unit: admin
Target-Version: 1.0.2
Delivery-Profile: web-release-train

Target-Delivery-Unit: client
Target-Version: 1.1.0
Delivery-Profile: web-release-train

Target-Delivery-Unit: backend
Target-Version: 1.0.2
Delivery-Profile: backend-service

Target-Delivery-Unit: agent_api_cli
Target-Version: 0.1.0
Delivery-Profile: package-or-local

Target-Delivery-Unit: operations
Target-Version: 1.1.0
Delivery-Profile: backend-service

## Priority order

Bookgolas follows this release order:

1. Ship the next patch release: **1.0.2**.
2. Prepare and validate the Android / Google Play release.
3. Publish the Android release to Google Play after the test and policy gates pass.

Owner-approved sequencing override (2026-08-12): byungsker approved starting
the P3 and P4 discovery issues in parallel with unfinished P0–P2 delivery work.
This changes discovery sequencing only; it does not change the release
priority, authorize production deployment, public package publication,
subscription reactivation, or destructive data access.

독립 배포되는 운영 웹은 승인된 병렬 release train인 **admin 1.0.2**를
사용한다. 모바일 1.0.2 바이너리 범위는 바뀌지 않는다.

소비자 웹과 공개 랜딩의 승인된 구현 대상은 **client 1.1.0**이다. 이 라인은
**admin 1.0.2**와 분리하며, 소비자 서비스의 production 출시는 별도 gate를 거친다.

## Client/Admin 버전 라인 이관

새 라인은 증거 문서를 정확한 seed 브랜치에 동기화하고 해당 커밋을
attestation으로 등록할 때까지 `planned` 상태로 둔다.

| 새 라인 | Seed 브랜치 | Seed SHA | 이관 대상 |
| --- | --- | --- | --- |
| `client 1.1.0` | `version/web/1.1.0` | `d9ce0799414a84acdee9f5a7585ae9cdc1cdf46c` | `web 1.1.0` 소비자 웹 |
| `admin 1.0.2` | `version/web/1.0.2` | `3db4f79652be82532d5d6fbd74f3e48b159c67f4` | `web 1.0.2` 운영 웹 |

기존 `web` 라인은 대응하는 대체 라인이 계획·활성화되는 동안 유지한다. 대체
라인이 활성화되고 소스 코드가 `apps/client/` 또는 `apps/admin/`으로 이동한 뒤,
해당 기존 `web` 라인만 닫고 활성 승격 출처를 제거한다. 기존 브랜치와 이력은
그대로 보존한다. Target Version Gate는 기존 `mobile`·`web` 라인에 현행 정책을
유지하고, 새 `client`·`admin` 라인에는 attestation이 포함된 schema v2를 적용한다.

루트 workspace 설정은 `governance` delivery unit이 소유한다. 각 앱의 FSD
`shared/` 레이어는 해당 앱에 속한다. 현재 앱 간 공유 패키지는 없다. `packages/`를
추가하기 전 소유 delivery unit과 허용 경로를 등록한다.

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

## 병렬 트랙 — admin 1.0.2 데이터 기반 운영

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

## P3 — Consumer Web Parity Discovery

Bookgolas will provide the mobile app's supported reading experience through an
authenticated consumer web surface. The web surface shares the mobile account,
data, domain states, permissions, and product language. Only platform-native
capabilities are excluded or replaced with an equivalent browser interaction.

Initial discovery scope:

- Build the app-to-web parity matrix and native-exception policy.
- Audit Supabase Auth, RLS, Storage, Edge Functions, and cross-surface sync in
  the Development environment using read-only checks.
- Establish the BLab/Figma visual baseline and responsive/accessibility
  contract, or record an explicit exception to BOK-376.
- Define and validate the M0 vertical slice: sign-in, home, book detail, page
  update, reload, and mobile/web synchronization.
- Confirm the web route tree and the release acceptance gates for M1 core
  parity.

구현 대상 라인은 `web-release-train` 프로필의 승인된 `client 1.1.0`이다.
The discovery issue is evidence-only and does not authorize consumer
implementation, branch creation, deployment, publication, or a consumer
production launch.

Start gate: P0 patch, P1 Android readiness, and P2 Google Play launch remain
ahead in product release priority. The owner-approved 2026-08-12 sequencing
override permits this bounded discovery to run in parallel.

Success gate: the parity matrix, exception policy, data/security audit, M0
acceptance checks, and owner decisions are recorded and ready for a separate
implementation work package.

Executable issue: BOK-411.

## P4 — Agent access surface discovery and implementation

Bookgolas will expose its existing reading capabilities to AI agents through a
versioned Agent API and a CLI-first companion surface. The CLI is an
independently versioned client of the Bookgolas product, not a separate product
at this stage.

Initial target delivery contract: `agent_api_cli 0.1.0` with the
`package-or-local` profile. This is a contract-first implementation line for
BOK-406: the first work package defines and verifies the authenticated,
read-only API and CLI contracts before expanding behavior. Before either
surface is independently deployed or published, the delivery contract must be
re-evaluated and split into an API backend unit and a CLI package unit if their
promotion paths differ.

Initial scope:

- Define the repeated agent job and capability catalog.
- Establish the authenticated, user-scoped Agent API contract.
- Build the deterministic `bookgolas` CLI with JSON output and stable exit
  codes, beginning with a contract-first, read-only implementation.
- Start with read-only commands for book search, library, reading progress,
  Recall, and reading insights.
- Redesign the Bookgolas Pro package and AI usage economics before subscription
  reactivation or public CLI access.

Start gate: P0, P1, P2, and P3 remain the product release priority. The
owner-approved 2026-08-12 sequencing override permits BOK-406's bounded,
contract-first implementation in parallel. This lane does not authorize
production deployment, public package publication, subscription reactivation,
or destructive data access.

Executable issue: BOK-406.

## Parallel preparation — AI Server Operations Readiness

Bookgolas의 AI 서버 운영 준비는 `operations 1.1.0`과
`backend-service` continuous profile을 사용한다. 이 line은 Supabase Edge
Functions, RAG/AI usage, FCM, 관리자 운영, CI, 보안, 관측성과 runbook 증거를
다루며, 운영 변경은 `main` 기반 검토 PR을 거친다.

문서화·CI·관측성처럼 제품 동작 위험이 낮은 작업은 P0 안정화와 병렬 진행할
수 있다. 인증, migration, 관리자 권한, 외부 알림, production 배포와 같은
변경은 각 issue의 독립 검증과 별도 권한 경계를 유지한다.

Executable issues: BOK-413, BOK-414, BOK-415, BOK-416, BOK-417, BOK-418,
BOK-419, BOK-420, BOK-421.

## Current evidence and unknowns

- iOS release state is connected in the Company Control Plane.
- Google Play public listing is not yet connected or released.
- Android signing readiness, Play Console app registration, and final Android
  runtime evidence require verification during P1.
