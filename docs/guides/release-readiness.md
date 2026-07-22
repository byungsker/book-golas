# Bookgolas 출시 체크리스트

## 자동 검증

- [ ] Flutter localization 생성 성공
- [ ] Flutter analyze 성공
- [ ] Flutter 전체 테스트 성공
- [ ] Web lint 성공
- [ ] Web production build 성공
- [ ] Edge Function type check 성공
- [ ] TestFlight 업로드 성공
- [ ] Production App Store Connect 업로드 성공

## GitHub Actions 비밀값

앱과 위젯은 서로 다른 provisioning profile이 필요합니다.

- [x] `PROVISIONING_PROFILE_BASE64`
- [ ] `PROVISIONING_PROFILE_WIDGET_BASE64`
- [x] `PROVISIONING_PROFILE_DEV_BASE64`
- [x] `PROVISIONING_PROFILE_WIDGET_DEV_BASE64`
- [x] App Store Connect API key 3종
- [x] Production·Development Supabase URL/key/project ref
- [x] RevenueCat public key

`PROVISIONING_PROFILE_WIDGET_BASE64`가 없으면 운영 IPA의 Widget Extension을 수동
서명할 수 없어 Production workflow가 실패합니다.

## 외부 콘솔

- [ ] App Store Connect 로그인 및 계약·세금·은행 상태 확인
- [ ] 앱 버전, 개인정보, 연령 등급, 카테고리, 지원 URL 완료
- [ ] iPhone 필수 사이즈 스크린샷 완료
- [ ] 월간·연간 구독 메타데이터와 심사 스크린샷 완료
- [ ] 앱 버전에 두 구독 연결
- [ ] RevenueCat 이메일 인증
- [ ] RevenueCat IAP key 검증 완료
- [ ] RevenueCat App Store Connect API key 등록·검증 완료
- [ ] RevenueCat Development·Production webhook 구성
- [ ] Sandbox 구매·복원·갱신·취소·만료 검증
- [ ] 심사용 계정 로그인 및 Pro 권한 검증

## 브랜치와 배포

1. `feature/* → daily/YYYY-MM-DD` PR을 merge commit으로 합칩니다.
2. `daily/YYYY-MM-DD → dev` PR을 merge commit으로 합칩니다.
3. TestFlight와 개발 Supabase 배포가 성공할 때까지 수정합니다.
4. Sandbox 테스트가 통과하면 `dev → main` PR을 merge commit으로 합칩니다.
5. Production environment를 승인하고 운영 배포를 확인합니다.
6. App Store Connect에서 빌드·구독을 선택하고 심사에 제출합니다.
7. 승인 후 수동 출시 또는 예약 출시를 실행합니다.

최종 확인일: 2026-07-23
