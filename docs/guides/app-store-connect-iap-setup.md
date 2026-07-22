# App Store Connect · RevenueCat 구독 출시 가이드

## 기준 구성

Bookgolas의 현재 앱 코드는 월간·연간 자동 갱신 구독만 지원합니다.

| 항목 | 값 |
| --- | --- |
| App bundle ID | `com.bookgolas.app` |
| App Store product ID | `monthly`, `yearly` |
| RevenueCat entitlement | `byungskerslab/북골라스 Pro` |
| Current offering | `Default` |
| Monthly package | `$rc_monthly` → `monthly` |
| Annual package | `$rc_annual` → `yearly` |

`lifetime` 상품은 앱 코드와 현재 RevenueCat offering에 없으므로 등록하거나 심사에
포함하지 않습니다.

## App Store Connect

1. Bookgolas 앱의 구독 그룹을 생성합니다.
2. `monthly`와 `yearly` 자동 갱신 구독을 등록합니다.
3. 각 상품에 한국어·영어 표시 이름, 설명, 가격, 심사 스크린샷을 입력합니다.
4. 유료 앱 계약, 세금, 은행 정보를 모두 활성 상태로 만듭니다.
5. Sandbox 테스터를 만들고 두 상품이 `제출 준비 완료`인지 확인합니다.
6. 새 앱 버전의 인앱 구입 항목에 두 구독을 연결합니다.

제품 ID는 생성 후 변경할 수 없습니다. RevenueCat과 코드에 등록된 `monthly`,
`yearly`를 그대로 사용합니다.

## RevenueCat 앱 연결

RevenueCat 프로젝트 `byungskerslab/북골라스`에서 다음을 확인합니다.

1. Apps에서 bundle ID가 `com.bookgolas.app`인지 확인합니다.
2. Apple In-App Purchase Key가 검증 완료 상태인지 확인합니다.
3. App Store Connect API Key의 `.p8`, Key ID, Issuer ID를 모두 등록합니다.
4. Products의 App Store `monthly`, `yearly` 상태가 정상 조회되는지 확인합니다.
5. Entitlements에서 두 상품이 `byungskerslab/북골라스 Pro`에 연결됐는지 확인합니다.
6. Default offering에 `$rc_monthly`, `$rc_annual` 두 패키지만 활성화합니다.
7. 이메일 인증과 프로젝트 권한을 완료합니다.

App Store Connect API Key가 없거나 검증 중이면 상품 상태·가격을 확인할 수 없으며
출시 준비가 끝난 것으로 간주하지 않습니다.

## Webhook

RevenueCat의 Integrations → Webhooks에 환경별 구성을 추가합니다.

| 환경 | URL |
| --- | --- |
| Development | `https://reoiqefoymdsqzpbouxi.supabase.co/functions/v1/revenuecat-webhook` |
| Production | `https://enyxrgxixrnoazzgqyyd.supabase.co/functions/v1/revenuecat-webhook` |

각 구성의 Authorization header는 해당 Supabase 프로젝트의
`REVENUECAT_WEBHOOK_AUTH_KEY`와 동일한 `Bearer <key>`여야 합니다. 테스트 이벤트를
보낸 뒤 RevenueCat의 성공 응답과 `subscription_events` 저장을 모두 확인합니다.

## Sandbox 필수 시나리오

1. 무료 계정으로 paywall을 열어 월간·연간 가격을 확인합니다.
2. 월간 구독 구매 후 Pro 기능과 entitlement가 즉시 활성화되는지 확인합니다.
3. 앱 재실행·로그아웃·재로그인 후 권한이 유지되는지 확인합니다.
4. 구매 복원을 실행해 동일 계정에서 권한이 복원되는지 확인합니다.
5. 갱신·취소·만료 테스트 이벤트가 DB 상태에 반영되는지 확인합니다.
6. 연간 상품도 같은 흐름을 반복합니다.

## 출시 체크리스트

- [ ] App Store Connect 로그인 및 계약 상태 확인
- [ ] `monthly`, `yearly` 메타데이터와 심사 스크린샷 완료
- [ ] 두 상품을 제출할 앱 버전에 연결
- [ ] RevenueCat IAP Key 검증 완료
- [ ] RevenueCat App Store Connect API Key 검증 완료
- [x] Entitlement `byungskerslab/북골라스 Pro` 연결 확인
- [x] Default offering의 두 패키지 확인
- [x] Development·Production webhook 구성
- [ ] Development·Production webhook 테스트 성공
- [ ] Sandbox 월간·연간 구매, 복원, 만료 테스트 성공

최종 확인일: 2026-07-23
