# Bookgolas 장기 작업 최소 하네스

이 하네스는 Bookgolas의 Flutter app, Next.js web, Supabase Functions/DB와
operations CI 작업을 위한 bounded execution contract다. 실제 scheduler,
sandbox, secret broker 또는 production 권한을 제공하지 않는다.

## 최소 도구

- 읽기: `rg`, 제한된 파일 읽기, `git status/diff/log/show`, `gh pr view`와
  `gh run view`로 정책·이슈·로드맵·현재 SHA를 확인한다.
- 쓰기: `apply_patch`만 사용하고 `harness-policy.json`의 허용 경로와 현재
  task scope가 일치할 때만 수정한다.
- 실행·검증: `run.py`가 shell 없이 허용 명령만 실행하고 명령별 5분 timeout과
  사용량을 기록한다. Flutter `analyze/test`, Web `lint/build/test`, Deno
  `test/check`, `supabase db lint --local`과 Python validator만 사용한다.
  hosted·production 대상은 포함하지 않는다.
- 재개: `resume.py`가 상태와 이벤트를 검증한 뒤 목표, 현재 단계, 완료 항목,
  blocker, next action, exact SHA를 구조화해 출력한다.
- 전달 상태: GitHub 상태는 읽을 수 있지만 commit, push, PR, merge, deploy,
  release는 별도 사람 승인이 있어야 한다.

## 권한과 상태

읽기는 기본 허용하되 `.env`, secret-like 파일, `node_modules`, `.git`은 제외한다.
쓰기 범위는 현재 작업과 policy의 allowlist 교집합이다. 삭제·외부 발송·provider
호출·hosted/production 변경은 기본 disabled다.

실행 상태는 `runtime/task-state.json`, append-only 이벤트는
`runtime/events.jsonl`에 저장한다. `runtime/.gitignore`로 실제 상태를 Git에서
제외하고, `task-state.example.json`과 `events.example.jsonl`만 형상 관리한다.
상태에는 task ID, 목표, scope, branch, base/head SHA, 시작·checkpoint 시각,
현재 단계, 완료 항목, next action, blocker, 구조화된 승인, 예산·실사용량,
복구 모드와 검증 증거만 기록한다. prompt, response, credential, token,
customer data와 raw provider payload는 기록하지 않는다.
승인은 `approval_id`, action, target, scope, head SHA, actor, 만료 시각과
소비 여부를 함께 가져야 하며 위험 이벤트와 정확히 일치해야 한다.

## 재개·한도·승인

재개 순서는 state → 최근 event tail → `AGENTS.md`와 `.byungskerlab/` 정책 →
canonical issue/roadmap → Git dirty path와 exact SHA → 마지막 실패와 next action이다.
외부 효과는 자동 재실행하지 않는다. 실행 래퍼는 시작 시 elapsed/attempts를
확인하고, 종료 시 실제 duration과 누적 사용량을 state/event에 기록한다.
실행당 45분, 최대 3회, LLM USD 5, provider 호출 0, 외부 지출 USD 0으로
제한하고 명령 하나는 5분을 넘기지 않는다.

삭제, 자격증명·서명·결제·계정 변경, hosted/production DB·Function 변경,
외부 발송, workflow/policy 변경, commit/push/PR/merge/deploy/release는 사람이
정확한 범위와 대상을 승인해야 한다.

## 실패와 검증

일시 오류는 원인 확인 후 한 번만 재시도한다. 테스트 실패, scope drift, dirty
파일 충돌, SHA 변경, 승인 만료는 checkpoint 후 중단한다. secret 노출, 오삭제,
데이터 손상, 권한 오류, 외부 효과 결과 불명은 복구를 시도하지 않고 사람에게
넘긴다. 완료에는 validator, 관련 로컬 checks, 실제 Git diff, 이벤트 순서와
exact head 검사가 모두 필요하다.

## 사용법

```bash
python3 docs/agent-harness/validate.py \
  --state docs/agent-harness/task-state.example.json \
  --events docs/agent-harness/events.example.jsonl

python3 docs/agent-harness/resume.py \
  --state docs/agent-harness/runtime/task-state.json \
  --events docs/agent-harness/runtime/events.jsonl

python3 docs/agent-harness/run.py \
  --state docs/agent-harness/runtime/task-state.json \
  --events docs/agent-harness/runtime/events.jsonl \
  --command-class local_verify -- python3 docs/agent-harness/test_validate.py
```

검증 실패는 종료 코드 `1`과 구조화된 오류를 반환한다.
실제 작업의 exact SHA와 Git 상태까지 검사할 때는 validator와 resume에
`--repo .`를 추가한다.
