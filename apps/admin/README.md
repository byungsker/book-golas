# 북골라스 Admin 웹 앱

관리자 전용 Next.js 앱입니다. Client 앱과 별도 배포 경계로 운영하며, 도메인 루트 `/`에서 대시보드를 시작합니다. Next.js App Router 파일은 `app/`, FSD 코드는 `src/`에 둡니다.

## 개발

저장소 루트에서 실행합니다.

```bash
pnpm install
pnpm dev:admin
```

기본 주소는 `http://localhost:3001`입니다. 환경변수는 이 폴더의 `.env.example`을 기준으로 `.env.local`에 설정합니다.
