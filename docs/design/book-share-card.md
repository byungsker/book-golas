# Bookgolas 독서 현황 공유 카드 디자인

## 디자인 판정

상태: 초기 세로형 Night Bookmark 기준안 복원, 독립 디자인 게이트 검토 중

상세 아트 디렉션과 대안 방향 비교는 [book-share-card-art-direction.md](book-share-card-art-direction.md)에 기록한다.

목표는 앱을 모르는 독서자가 이미지를 2초 안에 이해하고, 기록의 내용에 관심을 가진 뒤 Bookgolas를 자연스럽게 발견하게 하는 것이다. 카드는 광고 배너가 아니라 개인 독서 기록의 편집물처럼 보여야 한다.

## 독서자 관점의 정보 우선순위

1. 이 책에서 무엇을 생각했는가 — 선택한 노트
2. 어떤 책을 읽고 있는가 — 표지, 제목, 저자
3. 어디까지 읽었는가 — 퍼센트, 진행 바, 현재/전체 페이지
4. 언제까지 읽을 것인가 — 마감일과 남은 일수
5. 어떤 기록을 쌓았는가 — 시작일과 기록 수
6. 어디에서 기록했는가 — 최소한의 Bookgolas 브랜드 노출

별점은 읽는 중 상태에서 의미가 없으므로 노출하지 않는다.

## 레이아웃 계약

- 기본 공유 비율: 400×780 세로 카드. 표지와 노트가 충분한 호흡을 갖는 초기
  기준안을 유지하며, 피드 게시 시에는 플랫폼별 배경 여백 또는 크롭 미리보기를
  확인한다.
- 안전 여백: 모든 콘텐츠는 좌우 28dp, 상하 최소 20dp 안에 둔다.
- 읽는 중 상태의 순서: 표지/상태 → 제목/저자 → 노트 → 진행률 → 시작일/기록 수 → 브랜드.
- 노트는 최대 5줄을 우선 노출하고, 여러 기록을 합칠 때 문단 사이에 빈 줄을 유지한다.
- 진행률은 숫자만으로 판단하지 않도록 퍼센트와 진행 바를 함께 제공한다.
- 마감 초과는 경고 색상과 명시적인 기간 텍스트로 표현한다.

## 시각 언어

- `BLabColors.elevatedDark`에서 `scaffoldDark`로 이어지는 잉크색 배경으로
  피드에서 표지와 노트의 존재감을 만든다.
- Blab primary(`#5B7FFF`)는 진행 상태와 노트 인용부호를 위한 단일 강조색으로 사용한다.
- 본문은 `BLabColors.textPrimaryDark`, 보조 정보는 `BLabColors.textSecondaryDark`와
  `BLabColors.textTertiaryDark`로 위계를 만든다.
- 기준안의 짧은 메타데이터에는 달력·전구 등 익숙한 이모지를 장식적으로
  사용하되, 의미는 항상 현지화된 텍스트로 함께 전달한다.
- 제목은 강한 대비의 한 단계, 메타 정보는 두 단계 낮은 대비, 보조 정보는 세 단계 낮은 대비로 구분한다.
- 브랜드는 하단에 작게 배치하고, 별도 광고 문구나 다운로드 유도 문구는 넣지 않는다.

## 상태·예외 계약

- reading + note: 노트가 진행률보다 먼저 나온다.
- reading + no note: 노트 패널을 생략하고 진행률을 먼저 보여준다.
- total pages가 0: 퍼센트는 0%, 페이지 표기는 현재 페이지만 보여준다.
- deadline이 지난 경우: `days overdue`/`일 지남`을 경고 색상으로 보여준다.
- completed: 노트/리뷰를 핵심 기록으로 보여주고 별점은 표시하지 않는다.
- 긴 제목·저자·노트: 제목 2줄, 저자 1줄, 노트 5줄에서 말줄임한다.
- cover 오류/누락: 동일한 비율의 책 아이콘 플레이스홀더를 사용한다.

## 접근성·현지화

- 한국어와 영어 ARB에 모든 사용자 노출 문구를 함께 등록한다.
- 색상만으로 상태를 구분하지 않고 상태 텍스트와 아이콘을 함께 사용한다.
- 공유 이미지의 텍스트 대비를 우선하고, 원문 노트가 잘리지 않도록
  선택/편집 단계에서 미리 안내한다. 외부 SNS에서의 대체 텍스트 입력은
  게시 단계의 후속 접근성 과제로 남긴다.
- 날짜, 페이지 단위, 남은 기간은 locale에 맞게 포맷한다.

## 검증 체크

- [x] 복원한 세로형 실제 렌더에서 표지·노트·진행률·브랜드가 모두 안전
  영역에 들어온다. (실제 iPhone Simulator 캡처 PNG 1200×2340 확인)
- [x] reading, no-note, completed, planned, retry, Korean, English의 문자열·상태 분기를 위젯 테스트로 검증했다. (시각 검증과 별도)
- [x] 긴 콘텐츠에서 가로 overflow가 없는 composer 동작을 검증했다. (대형 텍스트·12개 노트 테스트 포함)
- [x] 카드 캡처와 실제 share_plus 공유 파일의 비율이 일치한다.
  (BookShareService의 3× 캡처 정책과 400×780 카드 비율 검증)
- [ ] 2× 텍스트 스케일과 긴 제목 reflow를 실제 렌더로 확인한다.
- [ ] 독립 디자인 conformance 리뷰를 통과한다.
- [ ] 독립 aesthetic/share-worthiness 리뷰를 통과한다.

최신 실기기 비율 렌더 증거:

- [복원된 최종 카드](assets/book-share-card-restored-2026-07-26.png)
- [다크 에디토리얼 최종안](assets/book-share-card-dark-editorial-final.png)
- [다크 에디토리얼 썸네일](assets/book-share-card-dark-editorial-thumbnail.png)

이전 기준선 렌더:

- [한국어 에디토리얼 기준선](assets/book-share-card-editorial-ko.png)
- [영어 에디토리얼 기준선](assets/book-share-card-editorial-en.png)
- [네이티브 공유 카드 기준선](assets/book-share-card-native-share.png)
- [네이티브 공유 시트 기준선](assets/book-share-native-share-sheet.png)
