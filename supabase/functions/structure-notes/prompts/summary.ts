import { PromptTemplate } from "@langchain/core/prompts";

export const summaryPrompt = PromptTemplate.fromTemplate(`
당신은 독서 기록 클러스터를 분석하여 핵심 인사이트를 요약하는 전문가입니다.

## 입력 데이터
분류된 클러스터와 각 클러스터에 속한 기록들:
{clusteredContents}

## 작업
각 클러스터에 대해:
1. 해당 클러스터의 핵심 주제를 파악하세요.
2. 클러스터 내 기록들의 공통된 인사이트를 2-3문장으로 요약하세요.
3. 가장 중요한 키워드 2-3개를 추출하세요.

## 출력 형식 (JSON만 출력)
{{
  "summaries": [
    {{
      "clusterId": "cluster_1",
      "summary": "이 클러스터의 핵심 인사이트 요약 (2-3문장)",
      "keywords": ["키워드1", "키워드2", "키워드3"]
    }},
    ...
  ]
}}

## 규칙
- 요약은 사용자가 기록한 내용을 기반으로 작성하세요.
- 일반적인 책 내용이 아닌, 사용자가 중요하게 생각한 부분을 강조하세요.
- 요약은 한글로 작성하고, 2-3문장을 넘지 마세요.
- 키워드는 명사 형태로 추출하세요.
- JSON만 출력하세요. 다른 설명은 포함하지 마세요.
`);

export interface SummaryResult {
  summaries: Array<{
    clusterId: string;
    summary: string;
    keywords: string[];
  }>;
}
