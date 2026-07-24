# RevenueCat 구독 재활성화 런북

## 목적

Bookgolas는 현재 모든 기능을 무료로 제공하고 AdMob 광고를 표시합니다. RevenueCat 코드와 구독 UI는 삭제하지 않고 빌드 타임 피처 플래그 뒤에 보관되어 있습니다.

나중에 구독 모델을 다시 출시할 때는 이 문서를 작업의 기준으로 사용합니다.

에이전트에게는 다음과 같이 지시하면 됩니다.

> `docs/guides/revenuecat-reactivation.md`를 기준으로 RevenueCat 구독을 TestFlight에서 먼저 복구하고, 검증 결과를 보고해줘. 운영 출시는 하지 마.

운영 출시까지 맡기려면 TestFlight 검증 후 별도로 명시적으로 요청합니다.

## 현재 비활성 상태

- 피처 플래그: `app/lib/config/feature_flags.dart`
- 플래그 이름: `PAID_SUBSCRIPTIONS_ENABLED`
- 기본값: `false`
- RevenueCat 초기화 경계: `app/lib/data/services/subscription_service.dart`
- 앱 초기화 경계: `app/lib/main.dart`
- 구독 화면: `app/lib/ui/subscription/`
- 구독 버튼: `app/lib/ui/auth/widgets/my_page_screen.dart`
- Pro 배너: `app/lib/ui/home/widgets/home_screen.dart`
- 무료 공개 기간의 사용량 제한 우회: `app/lib/utils/subscription_utils.dart`

플래그가 `false`이면 RevenueCat SDK 초기화, 구매, 복원, 고객센터, 로그아웃 호출이 모두 차단됩니다. 구독 UI가 숨겨지고 책·AI Recall·OCR 제한은 적용되지 않습니다. AdMob은 비관리자 사용자에게 계속 표시됩니다.

## CI 피처 플래그

GitHub Actions는 다음 Repository variable을 읽습니다.

| 환경 | Repository variable | 기본값 |
| --- | --- | --- |
| TestFlight/dev | `PAID_SUBSCRIPTIONS_ENABLED_DEV` | `false` |
| App Store/prod | `PAID_SUBSCRIPTIONS_ENABLED_PROD` | `false` |

변수가 없거나 `false`이면 구독은 비활성 상태입니다. 운영 변수를 먼저 켜지 않습니다.

로컬 확인:

```bash
cd app

flutter run \
  --flavor dev \
  -t lib/main_dev.dart \
  --dart-define=PAID_SUBSCRIPTIONS_ENABLED=true
```

구독 비활성 상태 확인:

```bash
cd app

flutter run \
  --flavor dev \
  -t lib/main_dev.dart \
  --dart-define=PAID_SUBSCRIPTIONS_ENABLED=false
```

## 재활성화 순서

### 1. 계약 및 사업 준비 확인

- App Store Connect의 Paid Apps 계약, 세금 및 지급 계좌 상태를 확인합니다.
- 회사 겸업 규정, 육아휴직급여 신고 의무, 사업자등록 및 세무 일정을 다시 확인합니다.
- 이 단계가 완료되기 전에는 운영 구독을 활성화하지 않습니다.

### 2. 상품 정의를 하나로 확정

기존 문서와 코드에 과거 설정이 함께 남아 있으므로 아래 항목을 대시보드 기준으로 먼저 확정합니다.

- 월간 및 연간 Product ID
- 실제 판매 가격과 통화
- RevenueCat Entitlement ID
- RevenueCat Offering 및 Package

현재 코드의 Entitlement ID는 다음과 같습니다.

```text
byungskerslab/북골라스 Pro
```

`docs/guides/app-store-connect-iap-setup.md`에는 과거 Entitlement와 가격 정보가 포함되어 있습니다. 대시보드와 코드가 다르면 임의로 맞추지 말고 사용자에게 확인합니다.

### 3. App Store Connect 준비

- 구독 그룹과 월간·연간 상품의 상태를 확인합니다.
- 표시 이름, 설명, 가격, 심사 스크린샷, 심사 메모를 최신 상태로 갱신합니다.
- 새 앱 버전에 구독 상품을 연결합니다.
- 자동 갱신 구독에 필요한 이용약관 및 개인정보처리방침 링크를 확인합니다.

### 4. RevenueCat 준비

- App Store Connect 앱 연결 상태를 확인합니다.
- Products가 App Store Product ID와 정확히 일치하는지 확인합니다.
- Entitlement가 코드의 ID와 정확히 일치하는지 확인합니다.
- Default Offering에 월간·연간 Package가 연결되어 있는지 확인합니다.
- dev/prod 빌드에 `REVENUECAT_PUBLIC_KEY`가 안전한 환경변수로 제공되는지 확인합니다.

실제 키 값은 문서나 Git에 기록하지 않습니다.

### 5. TestFlight에서 먼저 활성화

1. GitHub Repository variable `PAID_SUBSCRIPTIONS_ENABLED_DEV=true`를 설정합니다.
2. TestFlight 빌드를 생성합니다.
3. Sandbox 계정으로 아래 체크리스트를 검증합니다.

검증 항목:

- [ ] 홈에 Pro 안내가 표시됨
- [ ] 마이페이지에서 구독 관리 화면에 진입 가능
- [ ] 월간 상품과 연간 상품의 현지 가격이 정상 표시됨
- [ ] 신규 구매 성공 후 Pro 권한이 즉시 반영됨
- [ ] 앱 재실행 후 Pro 권한이 유지됨
- [ ] 구매 복원이 동작함
- [ ] 고객센터 또는 구독 관리 진입이 동작함
- [ ] Pro 사용자는 광고가 보이지 않음
- [ ] 무료 사용자는 광고가 보임
- [ ] 무료 사용자의 책·AI Recall·OCR 제한이 의도대로 적용됨
- [ ] 로그아웃 및 다른 계정 로그인 시 권한이 섞이지 않음

### 6. 메타데이터와 법적 문서 복원

현재 다음 파일은 무료+광고 모델을 설명합니다. 구독 출시 내용과 일치하도록 함께 수정합니다.

- `app/metadata/app-description-ko.md`
- `app/metadata/app-description-en.md`
- `app/metadata/review-notes.md`
- `app/lib/ui/auth/utils/legal_content.dart`
- `app/privacy-policy.md`
- `app/terms-of-service.md`
- `app/lib/l10n/app_ko.arb`
- `app/lib/l10n/app_en.arb`

가격 문자열은 App Store Connect의 실제 현지화 가격과 일치시킵니다. 사용자에게 표시되는 새 문구는 한국어와 영어를 함께 반영합니다.

### 7. 운영 활성화

TestFlight 검증과 App Review 준비가 끝난 뒤에만:

1. `PAID_SUBSCRIPTIONS_ENABLED_PROD=true`를 설정합니다.
2. prod 빌드를 생성합니다.
3. 구독 상품을 새 앱 버전과 함께 App Review에 제출합니다.
4. 승인 후 실제 구매, 권한 부여, 광고 제거를 소액 결제로 점검합니다.

## 코드 검증

```bash
cd app

flutter test \
  test/config/feature_flags_test.dart \
  test/data/services/subscription_service_test.dart \
  test/ui/core/view_model/ad_view_model_test.dart

flutter analyze \
  lib/config/feature_flags.dart \
  lib/data/services/subscription_service.dart \
  lib/ui/core/view_model/ad_view_model.dart

flutter build ios \
  --no-codesign \
  --flavor dev \
  -t lib/main_dev.dart \
  --dart-define=PAID_SUBSCRIPTIONS_ENABLED=true
```

기본값이 계속 `false`인지 확인하는 테스트는 `true` 빌드와 분리해서 실행합니다.

## 긴급 비활성화 및 롤백

구독 경로에 문제가 있으면:

1. `PAID_SUBSCRIPTIONS_ENABLED_PROD=false`로 되돌립니다.
2. 새 버전을 빌드해 긴급 심사를 요청합니다.
3. RevenueCat 또는 App Store Connect에서 상품을 삭제하지 않습니다.
4. 기존 구독자의 권리와 복원 경로를 먼저 확인합니다.
5. 장애 원인과 기존 구독자 처리 방안을 확정한 뒤 다시 활성화합니다.

피처 플래그는 빌드 타임 상수이므로 이미 설치된 앱을 원격으로 즉시 끌 수 없습니다. 운영 활성화 전 TestFlight 검증이 필수입니다.
