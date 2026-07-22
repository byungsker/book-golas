# RevenueCat Webhook 배포 가이드

`revenuecat-webhook`은 RevenueCat 구독 이벤트를 Supabase의 사용자 구독 상태와
`subscription_events`에 반영합니다.

## 배포 원칙

- 개발 배포는 `daily → dev` 머지 후 TestFlight CI가 수행합니다.
- 운영 배포는 `dev → main` 머지 후 Production CI가 수행합니다.
- 운영 프로젝트에 로컬 CLI로 직접 배포하거나 secret을 변경하지 않습니다.
- GitHub Production environment 승인 후에만 운영 마이그레이션과 함수 배포가 진행됩니다.

## 환경별 설정

| 환경 | Project ref | Webhook URL |
| --- | --- | --- |
| Development | `reoiqefoymdsqzpbouxi` | `https://reoiqefoymdsqzpbouxi.supabase.co/functions/v1/revenuecat-webhook` |
| Production | `enyxrgxixrnoazzgqyyd` | `https://enyxrgxixrnoazzgqyyd.supabase.co/functions/v1/revenuecat-webhook` |

GitHub에는 `REVENUECAT_WEBHOOK_AUTH_KEY_DEV`와
`REVENUECAT_WEBHOOK_AUTH_KEY_PROD`를 서로 다른 값으로 저장합니다. 배포 workflow가
대상 Supabase 프로젝트의 `REVENUECAT_WEBHOOK_AUTH_KEY`로 주입합니다. RevenueCat
Webhook의 Authorization header는 `Bearer <해당 환경 키>` 형식으로 일치해야
합니다. 키를 저장소, 문서, 로그에 남기지 않습니다.

`revenuecat-webhook`은 Supabase gateway JWT 검증을 비활성화하고 함수 내부에서
전용 webhook key를 검증합니다. RevenueCat Authorization 값을 Supabase JWT로
해석하면 함수 실행 전 401이 발생하므로 `verify_jwt = false`를 유지해야 합니다.

## RevenueCat 설정

1. Integrations → Webhooks → Add new configuration을 엽니다.
2. Development와 Production 구성을 각각 만듭니다.
3. 환경별 URL과 Authorization header를 입력합니다.
4. 모든 구독·구매 이벤트를 전송하도록 설정합니다.
5. 테스트 이벤트를 보내 HTTP 200을 확인합니다.

현재 이벤트 처리 대상은 최초 구매, 갱신, 재활성화, 상품 변경, 취소, 결제 문제,
만료, 환불입니다.

## 검증

개발 환경에서 먼저 다음을 확인합니다.

```sql
select event_type, product_id, transaction_id, created_at
from subscription_events
order by created_at desc
limit 20;

select id, subscription_status, subscription_expires_at, revenuecat_user_id
from users
where revenuecat_user_id is not null;
```

검증 기준:

- RevenueCat 테스트 전송이 HTTP 200을 반환합니다.
- 동일 이벤트 재전송이 중복 데이터나 잘못된 상태 전이를 만들지 않습니다.
- `monthly`는 `pro_monthly`, `yearly`는 `pro_yearly`로 반영됩니다.
- 만료·환불은 `free`, 취소·결제 문제는 만료일 유지로 반영됩니다.
- 인증 실패는 401, 알 수 없는 사용자는 404로 기록됩니다.

운영은 main CI 배포 완료 후 별도 테스트 이벤트로 같은 항목을 확인합니다.

최종 확인일: 2026-07-23
