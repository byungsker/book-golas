# Edge Function 독립 배포

Supabase Edge Function은 Flutter와 별도의 배포 단위다. iOS TestFlight와
App Store 워크플로는 데이터베이스 마이그레이션과 앱 빌드만 수행하며,
Edge Function을 자동 배포하지 않는다.

## 배포 원칙

1. 배포할 커밋의 테스트와 PR 검사를 완료한다.
2. 대상 환경과 함수 이름을 명시한다.
3. `.github/workflows/deploy-edge-functions.yml`을 수동 실행한다.
4. 운영 배포는 제품 소유자의 명시적 승인을 받은 뒤 실행한다.
5. 실행 로그와 Supabase의 활성 함수 버전을 확인한다.

단일 함수를 우선 배포한다. 함수 이름을 비우면 모든 Edge Function이
배포되므로 운영 긴급 수정에는 사용하지 않는다.

## 환경

| 대상 | Supabase 프로젝트 | 용도 |
| --- | --- | --- |
| `dev` | `book-golas-dev` | 개발 및 검증 |
| `prod` | `book-golas` | 운영 |

## 롤백

배포 전 활성 함수 버전과 소스 커밋을 기록한다. 문제가 발생하면 직전
검증 커밋에서 같은 함수만 다시 배포하고, 배포 로그와 활성 버전을
재확인한다.

데이터베이스 마이그레이션은 롤백 특성이 다르므로 Edge Function 배포와
분리해 관리한다. 현재 마이그레이션 적용은 기존 모바일 릴리스
워크플로를 유지하며, 독립 backend 릴리스 라인이 활성화된 뒤 별도
승격 경로로 이전한다.
