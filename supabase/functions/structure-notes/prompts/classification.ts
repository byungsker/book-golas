import { PromptTemplate } from "@langchain/core/prompts";

export const classificationPrompt = PromptTemplate.fromTemplate(`
당신은 독서 기록을 분석하여 의미적으로 유사한 내용끼리 그룹화하는 전문가입니다.

## 입력 데이터
사용자의 독서 기록 (하이라이트, 메모, 사진 속 텍스트):
{contents}

## 작업
1. 위 독서 기록들을 주제/테마별로 3-7개의 클러스터로 분류하세요.
2. 각 클러스터에는 의미적으로 관련된 기록들을 배치하세요.
3. 각 클러스터에 적절한 이름을 부여하세요.

## 출력 형식 (JSON만 출력)
{{
  "clusters": [
    {{
      "clusterId": "cluster_1",
      "name": "클러스터 주제명",
      "nodeIds": ["node_id_1", "node_id_2", ...],
      "confidence": 0.85
    }},
    ...
  ]
}}

## 규칙
- 각 기록은 반드시 하나의 클러스터에만 속해야 합니다.
- 클러스터 이름은 한글로 2-5단어로 작성하세요.
- confidence는 0.0-1.0 사이의 값으로, 해당 분류의 확신도를 나타냅니다.
- 너무 작은 클러스터(1개 기록)는 피하고, 관련 클러스터에 병합하세요.
- JSON만 출력하세요. 다른 설명은 포함하지 마세요.
`);

export interface ClassificationResult {
  clusters: Array<{
    clusterId: string;
    name: string;
    nodeIds: string[];
    confidence: number;
  }>;
}
