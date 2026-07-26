# Bookgolas 독서 현황 공유 카드 — 아트 디렉션 패킷

## Surface job

- Audience: 책을 읽으며 짧은 메모와 진도를 남기는 성인 독자
- Moment: 한 권을 읽는 중 발견한 생각을 피드에 남기는 순간
- Platforms: Instagram Stories, Threads, LinkedIn의 세로형 공유 이미지
- Desired feeling: “이 책을 읽고 이런 생각을 했다”는 조용한 자부심과 호기심
- User action: 이미지의 문장을 읽고 책과 기록 방식에 관심을 갖는다
- Product relationship: Bookgolas는 광고 배너가 아니라 기록의 출처로만 작게 드러난다

## Evidence and benchmarks

| Reference | Useful signal | Deliberate rejection |
| --- | --- | --- |
| [Goodreads Year in Books](https://www.goodreads.com/book/show/208216246-goodreads-year-in-books-2024) | 공유를 유도하는 개인 성취 서사와 강한 한 문장 | 읽는 중인 책에 과한 축하·게임화는 맞지 않음 |
| [Bookmory](https://bookmory.net/) | 진도, 시작일, 기록 수를 한눈에 보여주는 실용 정보 | 대시보드형 카드와 작은 지표 나열은 피함 |
| [Bookshelf quote card](https://getbookshelf.com/) | 인용문을 중심으로 책과 저자를 편집물처럼 보여줌 | 배경 선택 UI처럼 보이는 장식적 커스터마이징은 제외 |

## Three visual directions

### A. Night bookmark — restored after owner visual review

큰 표지를 세로 화면의 첫 장면으로 두고, 사용자의 노트를 편집 잡지의 pull
quote로 강조한다. 깊은 잉크색 바탕, 밝은 활자, Blab blue 한 줄만 사용한다.

- Composition: centered cover hero → status → title/author → quote panel →
  progress panel → metadata
- Type: 큰 제목보다 노트 문장이 먼저 읽히는 editorial hierarchy
- Feeling: 몰입, 조용한 취향, 기록하는 사람의 관찰력
- Share reason: “이 책에서 이런 생각을 했다”를 바로 전달

상태별 의미는 텍스트와 아이콘으로 전달한다. 읽는 중은 Blab blue를 사용하고,
완독·예정·재독 배지는 각 상태의 semantic color를 보조적으로 사용한다.

### B. Margin note

표지를 배경처럼 크게 깔고 한쪽 여백에 노트와 진행률을 주석처럼 배치한다.

- Composition: full-bleed cover → translucent reading note → vertical progress
- Feeling: 책의 여백에 직접 메모한 듯한 개인성
- Rejected: 표지 이미지가 네트워크에서 늦게 오거나 긴 제목이 들어오면 가독성이
  급격히 흔들리고, 콘텐츠보다 이미지 효과가 앞설 위험이 크다.

### C. Reading receipt

도서관 대출 영수증처럼 한 권의 읽기 기록을 시간·페이지·마감일로 정리한다.

- Composition: receipt header → title → monospaced progress table → note footer
- Feeling: 수집하고 축적하는 독서 습관
- Rejected: 기능적이지만 독서자의 생각보다 관리 데이터가 주인공이 되며,
  Bookgolas를 생산성 도구처럼 보이게 한다.

## Selection rationale

A안을 선택한다. 4:5 압축안은 피드 호환성은 높았지만 표지의 존재감과 독서
기록의 여유가 줄어들었다. 소유자 시각 검토에 따라 이전 세로형 구도를 기준안으로
복원하고, 이후에 추가된 노트 선택·직접 입력, 마감일, 남은 페이지와 남은 기간
기능은 유지한다. B안은 표지 의존성이 크고, C안은 기능적이지만 현재 제품의
독서 인사이트 서사와 거리가 있다.

## Implementation contract

- Canvas: 400×780 logical pixels, share export 1200×2340 at 3×
- Safe area: 28 horizontal, 20 minimum vertical
- Fixed export locale: render ko-KR and en-US separately; never mix labels
- Real content: cover URL, title, author, selected notes, current/total pages,
  deadline, start date, record count
- Edge states: no cover, no note, long title, long note, overdue, completed,
  planned, 2× text scaling
- Brand: `북골라스`/`Bookgolas` only as a quiet source line; no CTA or ad copy
- Accessibility: contrast-first typography, state icon + label, note selection
  semantics in the composer

## Open checks

- [ ] selected direction rendered in ko-KR and en-US
- [x] feed thumbnail and full-size visual check
- [ ] 2× text scaling and long-title reflow check
- [ ] independent conformance review
- [ ] independent aesthetic/share-worthiness review
