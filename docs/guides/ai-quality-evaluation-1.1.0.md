# AI 품질 평가 운영 가이드

`operations 1.1.0`의 BOK-427은 provider를 호출하지 않는 결정적 synthetic 평가로
LLM 호출 계약과 품질 회귀를 확인한다. 평가 결과는 릴리스 승격의 보조 증거이며,
실제 사용자 prompt·response·secret을 수집하거나 provider 설정을 변경하지 않는다.

## 평가 범위

다음 8개 호출 단계를 고정 계약으로 관리한다: `recall-search`의 embedding과
answer, `structure-notes`의 classification·summary·connection,
`recommend-next-books` recommendation, `extract-keywords` chat,
`generate-embedding` embedding. 각 계약은 provider, model, prompt ID, 입출력
schema, 소스 marker와 SHA-256을 보고한다. `reading-insights`와
`generate-book-review`는 현재 범위 밖이며 별도 issue에서 등록한다.

## 실행

저장소 루트에서 실행한다.

```bash
deno test --allow-read supabase/functions/llm-evals/evaluator.test.ts
deno run --allow-read supabase/functions/llm-evals/run.ts \
  --commit "$(git rev-parse HEAD)" --candidate synthetic
```

`synthetic`은 baseline과 분리된 고정 후보 결과다. 실제 후보 응답을 평가하려면
원문이 아닌 synthetic 결과 JSON을 `--candidate path.json`으로 전달한다. CI의
pull request 실행은 PR head를 checkout하고 `git rev-parse HEAD`와 제출 SHA를
일치시킨 뒤 후보를 명시적으로 평가한다.

```json
{"results":{"keyword-list-quality":{"keywords":["집중","습관","기록"]}}}
```

## 판정 및 대응

모든 케이스가 최소 0.80, 전체 가중 점수가 0.90 이상이고 baseline 대비 케이스 및
전체 회귀가 0.05 이하일 때만 `promotionGate: pass`다. 소스 marker가 없거나
기준을 충족하지 못하면 `block`으로 종료한다. 운영자는 마지막 통과 SHA로
rollback하고 원인을 기록한다. 예외 승격은 byungsker의 exact-SHA 승인, 사유,
평가 보고서, rollback 계획이 모두 있을 때만 별도 승인 기록으로 남기며 코드나
CI에서 우회하지 않는다.

보고서에는 raw fixture, 후보 응답, 사용자 데이터가 포함되지 않으며,
`providerCalls: 0`, `liveProviderCalls: false`, `candidateSource`,
`fixtureSha256`를 확인할 수 있어야 한다. 이미 baseline이 존재하는 후속 PR은
CI가 `contracts.ts`와 `fixtures.ts` 변경을 차단하므로, 기대값·기준선 변경은
별도 governance 검토로 분리한다.
