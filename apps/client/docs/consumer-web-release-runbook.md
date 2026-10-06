# Bookgolas Consumer Web 1.1.0 배포 점검 가이드

이 문서는 Consumer Web 배포 경계와 Preview 환경 검증에 필요한 설정·증거를 정리합니다. Production 배포, Admin 허용 목록 변경, Web 결제 활성화는 다루지 않습니다.

## Release contract

기계 판독용 설정은 `apps/client/docs/consumer-web-release-config.json`입니다. 배포 라인은 `version/web/1.1.0`이며 Node 22와 Next 16.3.0-preview.8을 사용합니다.

저장소 루트에서 아래 명령으로 Client 앱을 확인합니다.

    pnpm install --frozen-lockfile
    pnpm --filter @bookgolas/client run test:release-config
    pnpm --filter @bookgolas/client run lint
    pnpm --filter @bookgolas/client run build

Client 빌드는 Next.js 빌드 전에 `test:release-config`와 FSD 경계 검사를 실행합니다. 필수 환경변수가 없으면 아래 점검은 실패해야 합니다.

    pnpm --filter @bookgolas/client run test:release-config -- --fixture missing-required-env

이 명령은 종료 코드 1을 반환해야 합니다. fixture는 가상의 Preview 환경에서 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 제거하며 호스팅 서비스에 연결하지 않습니다.

## Vercel environment

| Variable | Scope | Rule |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Preview and Production | Match the Supabase project for the same scope |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Preview and Production | Public client key for the matching project |
| SUPABASE_SERVICE_ROLE_KEY | Preview and Production | Server-only; never expose as NEXT_PUBLIC |
| GOOGLE_BOOKS_API_KEY | Optional server | Provider key only when the route is configured |
| NAVER_CLIENT_ID | Optional server | Provider identifier only when the route is configured |
| NAVER_CLIENT_SECRET | Optional server | Server-only provider secret |

Preview must use the isolated Preview Supabase project. Production credentials
must never be copied into Preview. Provider keys, service-role keys and Edge
secrets must not be placed in client-visible variables.

## Supabase order

Use the local CLI and local Docker-backed Supabase instance for schema checks:

    supabase start
    supabase db reset --local
    pnpm --filter @bookgolas/client run reset:fixtures
    supabase db lint --local --level error
    supabase stop

The migration order for an isolated environment is:

    supabase db reset --local
    supabase db lint --local --level error
    supabase db push --include-all
    supabase migration list
    pnpm --filter @bookgolas/client run reset:fixtures

Development project ref is reoiqefoymdsqzpbouxi. Production project ref is
enyxrgxixrnoazzgqyyd. Link or push commands must name the intended project:

    supabase link --project-ref "$SUPABASE_PROJECT_REF_DEV"
    supabase db push --include-all
    supabase migration list

The deploy workflow is manual and requires the matching GitHub environment secrets.
Do not run its Production target for this issue.

## Edge Function Preview check

Set PREVIEW_ORIGIN to the disposable Preview origin and use the matching Preview
Supabase project ref:

    export PREVIEW_ORIGIN=https://preview.example.invalid
    export PREVIEW_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/<function-name>
    curl -i -X OPTIONS "$PREVIEW_FUNCTION_URL" -H "Origin: $PREVIEW_ORIGIN" -H "Access-Control-Request-Method: POST"
    curl -i -X POST "$PREVIEW_FUNCTION_URL" -H "Origin: $PREVIEW_ORIGIN" -H "Content-Type: application/json" -d '{}'

OPTIONS must return 204 with the configured Preview origin. The unauthenticated
POST must return 401 and contain no private data. A disposable authenticated
Preview user may then be used to check that auth.getUser validates the bearer
token and RLS limits reads and writes to auth.uid() = user_id. Check a disallowed
Origin as well; WEB_ALLOWED_ORIGINS must not reflect it.

These hosted checks are Preview-only. Do not deploy Production or mutate
Production data as part of this release-readiness task.

## Admin and consumer boundary

`apps/client`와 `apps/admin`은 독립적으로 실행·배포하는 Next.js 앱입니다. Client는 기존 소비자 URL을 유지하고, Admin은 별도 도메인의 `/`에서 대시보드를 시작합니다. Admin 로그인은 `/login`, API 경로는 `/api/admin/*`입니다. 인증되지 않은 요청은 로그인 화면으로 보내며 허용된 이메일만 Admin 화면과 API에 접근할 수 있습니다.

Client의 루트 `/privacy`, `/terms`, `/support`는 각각 `/ko/privacy`, `/ko/terms`, `/ko/support`로 이동합니다. `/en`과 `/ko` 경로는 해당 언어의 메타데이터와 문구를 표시합니다. Web 구독 기능은 비활성화되어 있으며 Web 구독 상태나 오프라인 동등성을 주장하지 않습니다. iOS 위젯, Siri/App Shortcuts, 네이티브 푸시, 카메라/OCR, 공유 시트, RevenueCat 구독은 네이티브 전용 범위입니다.

## Browser surface

저장소 루트에서 Client 브라우저 프로젝트를 각각 실행합니다.

    pnpm --filter @bookgolas/client run test:e2e -- --project=chromium
    pnpm --filter @bookgolas/client run test:e2e -- --project=webkit
    pnpm --filter @bookgolas/client run test:e2e -- --project=firefox

Playwright fixture 서버는 loopback에서만 실행합니다. 마케팅·다국어 메타데이터·법률 페이지와 Client 라우트를 확인합니다.

## Rollback and feature flags

롤백 시 마지막 정상 배포 또는 불변 릴리스 태그를 먼저 확인합니다. 가능하면 같은 아티팩트를 재배포하고, 소스 이력이 필요하면 해당 merge commit을 대상으로 revert PR을 엽니다. 롤백 뒤 인증, 주요 소비자 경로, 로그, 데이터 접근을 확인합니다.

앱 소스 롤백은 Supabase 스키마·데이터, Edge Function 배포, provider 설정, RevenueCat 상태를 되돌리지 않습니다. 호환성을 확인하고 DB와 외부 상태에 별도 복구 절차를 사용합니다.

릴리스 feature flag는 `webBilling=false`입니다. 라우트 fixture는 loopback만 허용합니다. Web 결제 활성화나 Admin 허용 목록 확대를 하지 않으며 Preview 검증을 Production 배포로 대체하지 않습니다.

Plan: .omo/plans/bookgolas-web-app-parity.md
