<!-- 아래 세 값은 브랜치, base, release source와 정확히 일치해야 합니다. -->
Target-Delivery-Unit:
Target-Version:
Delivery-Profile:
Promotion-Source-SHA:

> 이번 PR의 목적을 한 문장으로 요약해주세요.

## 📋 Changes

> 주요 변경사항을 bullet로 정리해주세요.

## 🧠 Context & Background

> 이 변경이 필요한 이유를 설명해주세요.
> 관련된 이슈나 문서 링크를 첨부해도 좋아요.

## ✅ How to Test

> 테스트 방법을 단계별로 작성해주세요.

- [ ] 타깃 버전 원본, branch, base, PR metadata가 모두 일치한다.

## 🧾 Screenshots or Videos (Optional)

> UI 변경이 있을 경우, Before / After 이미지를 첨부해주세요.

## 🔗 Related Issues

> 연관된 이슈를 연결해주세요.
> - Closes: #123
> - Related: #456

---

## 🗄️ Database Migration Checklist

> **CRITICAL**: DB 스키마 변경이 포함된 PR은 아래 체크리스트를 반드시 확인하세요.

### 마이그레이션 파일 확인
- [ ] 새로운 마이그레이션 파일이 `supabase/migrations/` 에 있습니까?
- [ ] 마이그레이션 파일명이 `YYYYMMDD_description.sql` 형식을 따릅니까?

### 환경별 적용 상태 (main 브랜치 머지 전 필수!)
- [ ] **Dev DB** (`reoiqefoymdsqzpbouxi`)에 마이그레이션 적용 완료
- [ ] **Prod DB** (`enyxrgxixrnoazzgqyyd`)에 마이그레이션 적용 완료 *(main 머지 시)*

### 안전성 확인
- [ ] 기존 데이터에 영향을 주는 변경인가요? (컬럼 삭제, 타입 변경 등)
  - [ ] Yes → 데이터 마이그레이션 계획이 있습니까?
  - [ ] No → 안전한 추가/수정입니다
- [ ] 롤백 SQL이 준비되어 있습니까? (필요시)

### Edge Function 확인
- [ ] 새로운 Edge Function이 포함되어 있습니까?
  - [ ] Yes → Dev 환경에 배포 완료
  - [ ] No → 해당 없음

---

## 🙌 Additional Notes (Optional)

> 기타 참고사항, TODO, 리뷰어에게 요청사항 등을 작성해주세요.
