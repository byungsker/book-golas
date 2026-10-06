# Client 1.1.0 버전 라인

Target-Delivery-Unit: client
Target-Version: 1.1.0
Delivery-Profile: web-release-train

상태: 계획됨. 소비자 웹과 공개 랜딩의 소스 기준은 기존
`version/web/1.1.0` 브랜치의 승인된 후보 seed입니다.

- 소스 브랜치: `version/web/1.1.0`
- 소스 및 seed SHA: `d9ce0799414a84acdee9f5a7585ae9cdc1cdf46c`
- 새 버전 라인: `version/client/1.1.0`
- 기존 라인 대응: `web 1.1.0` 소비자 웹
- 동기화 문서: 이 등록 문서, 소비자 릴리스 설정, parity matrix, BLDS 통합
  증거, 릴리스 runbook
- 동기화 검증: 소비자 릴리스 설정 테스트

문서를 새 버전 라인에 동기화하고 그 커밋을 attestation으로 등록한 뒤에만
제품 작업을 시작할 수 있습니다. 새 라인이 활성화되고 코드가 `apps/client/`로
이동한 뒤 기존 `web 1.1.0` 라인을 닫습니다.

`web/docs/consumer-parity-ledger.json`은 release manifest에 SHA가 고정된
기존 `web 1.1.0` 증거이므로 이 등록에서 수정하지 않습니다. client 라인에서
새 parity 증거와 manifest를 만들고 검증한 뒤 client 전용 ledger를 등록합니다.
