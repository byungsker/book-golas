import type { EvaluationCase } from "./contracts.ts";

export function syntheticVector(seed: number, dimension = 1536): number[] {
  return Array.from(
    { length: dimension },
    (_, index) => Number((Math.sin((index + 1) * (seed + 1)) * 0.5).toFixed(8)),
  );
}

const embeddingReference = syntheticVector(17);

export const SYNTHETIC_EVAL_CASES: readonly EvaluationCase[] = [
  {
    id: "recall-answer-relevance",
    surface: "recall-search.answer",
    weight: 0.12,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: {
      query: "집중을 유지하는 방법은 무엇인가요?",
      context: ["record-1", "record-2"],
    },
    expected: {
      sourceIds: ["record-1", "record-2"],
      answerAnchors: ["집중", "기록"],
    },
    baseline: {
      answer:
        "기록에서는 집중을 유지하려면 방해 요소를 줄이고 작은 습관을 반복한다고 설명합니다.",
      sourceIds: ["record-1", "record-2"],
    },
  },
  {
    id: "recall-embedding-shape",
    surface: "recall-search.embedding",
    weight: 0.1,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: { text: "집중을 돕는 독서 기록" },
    expected: { dimension: 1536, reference: embeddingReference },
    baseline: { embedding: embeddingReference },
  },
  {
    id: "structure-classification-groups",
    surface: "structure-notes.classification",
    weight: 0.14,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: {
      contents: ["record-1", "record-2", "record-3", "record-4"],
    },
    expected: {
      nodeIds: ["record-1", "record-2", "record-3", "record-4"],
      clusterCount: 2,
      groups: [
        ["record-1", "record-2"],
        ["record-3", "record-4"],
      ],
    },
    baseline: {
      clusters: [
        {
          clusterId: "cluster-1",
          name: "집중 습관",
          nodeIds: ["record-1", "record-2"],
          confidence: 0.95,
        },
        {
          clusterId: "cluster-2",
          name: "기록 성찰",
          nodeIds: ["record-3", "record-4"],
          confidence: 0.95,
        },
      ],
    },
  },
  {
    id: "structure-summary-anchors",
    surface: "structure-notes.summary",
    weight: 0.13,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: { clusters: ["cluster-1", "cluster-2"] },
    expected: {
      clusterIds: ["cluster-1", "cluster-2"],
      keywordAnchors: {
        "cluster-1": ["집중", "습관"],
        "cluster-2": ["기록", "성찰"],
      },
    },
    baseline: {
      summaries: [
        {
          clusterId: "cluster-1",
          summary: "집중을 위해 방해 요소를 줄이고 습관을 반복합니다.",
          keywords: ["집중", "습관"],
        },
        {
          clusterId: "cluster-2",
          summary: "기록을 돌아보며 성찰의 방향을 구체화합니다.",
          keywords: ["기록", "성찰"],
        },
      ],
    },
  },
  {
    id: "structure-connection-pairs",
    surface: "structure-notes.connection",
    weight: 0.13,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: { clusters: ["cluster-1", "cluster-2"] },
    expected: {
      pairs: [
        { from: "record-1", to: "record-3" },
        { from: "record-2", to: "record-4" },
      ],
    },
    baseline: {
      connections: [
        {
          fromNodeId: "record-1",
          toNodeId: "record-3",
          reason: "집중 습관이 기록 성찰을 돕습니다.",
        },
        {
          fromNodeId: "record-2",
          toNodeId: "record-4",
          reason: "반복 기록이 성찰의 근거가 됩니다.",
        },
      ],
    },
  },
  {
    id: "recommendation-list-quality",
    surface: "recommend-next-books.recommendation",
    weight: 0.14,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: { locale: "en", recommendationCount: 2 },
    expected: {
      count: 2,
      requiredTerms: ["focus", "habit"],
      requiredTitles: ["Deep Work", "Atomic Habits"],
    },
    baseline: {
      recommendations: [
        {
          title: "Deep Work",
          author: "Cal Newport",
          reason: "It develops sustained focus through deliberate routines.",
          keywords: ["focus", "attention"],
        },
        {
          title: "Atomic Habits",
          author: "James Clear",
          reason: "It turns small repeated actions into durable habits.",
          keywords: ["habit", "routine"],
        },
      ],
    },
  },
  {
    id: "keyword-list-quality",
    surface: "extract-keywords.chat",
    weight: 0.12,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: { contentIds: ["record-1", "record-2", "record-3"] },
    expected: { required: ["집중", "습관", "기록"], maxItems: 8 },
    baseline: { keywords: ["집중", "습관", "기록"] },
  },
  {
    id: "generate-embedding-shape",
    surface: "generate-embedding.embedding",
    weight: 0.12,
    minimumScore: 0.8,
    maxRegression: 0.05,
    input: { contentId: "record-1", contentType: "highlight" },
    expected: { dimension: 1536, reference: syntheticVector(23) },
    baseline: { embedding: syntheticVector(23) },
  },
];
