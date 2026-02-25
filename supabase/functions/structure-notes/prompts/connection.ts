import { PromptTemplate } from "@langchain/core/prompts";

export const connectionPrompt = PromptTemplate.fromTemplate(`
당신은 독서 기록들 사이의 의미적 연결고리를 찾는 전문가입니다.

## 입력 데이터
클러스터별로 분류된 독서 기록들과 요약:
{summarizedClusters}

## 작업
서로 다른 클러스터에 속한 기록들 사이에서 의미적 연결을 찾으세요:
1. 유사한 개념이나 아이디어를 공유하는 기록들
2. 인과관계가 있는 기록들 (A가 B의 원인/결과)
3. 상호 보완적인 관점을 제시하는 기록들
4. 같은 주제를 다른 각도에서 다루는 기록들

## 출력 형식 (JSON만 출력)
{{
  "connections": [
    {{
      "fromNodeId": "node_id_1",
      "toNodeId": "node_id_2",
      "reason": "두 기록이 연결되는 이유 (1-2문장)"
    }},
    ...
  ]
}}

## 규칙
- 같은 클러스터 내의 기록들은 연결하지 마세요 (이미 그룹화됨).
- 연결은 의미있는 것만 포함하세요 (최소 3개, 최대 10개).
- reason은 한글로 작성하고, 구체적으로 왜 연결되는지 설명하세요.
- 억지스러운 연결은 피하세요. 명확한 관계가 있는 것만 포함하세요.
- JSON만 출력하세요. 다른 설명은 포함하지 마세요.
`);

export interface ConnectionResult {
  connections: Array<{
    fromNodeId: string;
    toNodeId: string;
    reason: string;
  }>;
}
