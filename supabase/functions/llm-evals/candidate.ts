import type { CandidateResults } from "./contracts.ts";
import { syntheticVector } from "./fixtures.ts";

export function syntheticCandidateResults(): CandidateResults {
  return {
    "recall-answer-relevance": {
      answer: "집중을 위해 방해 요소를 줄이고 기록 습관을 반복합니다.",
      sourceIds: ["record-1", "record-2"],
    },
    "recall-embedding-shape": { embedding: syntheticVector(17) },
    "structure-classification-groups": {
      clusters: [
        {
          clusterId: "cluster-1",
          name: "집중 습관",
          nodeIds: ["record-1", "record-2"],
          confidence: 0.91,
        },
        {
          clusterId: "cluster-2",
          name: "기록 성찰",
          nodeIds: ["record-3", "record-4"],
          confidence: 0.9,
        },
      ],
    },
    "structure-summary-anchors": {
      summaries: [
        {
          clusterId: "cluster-1",
          summary: "집중을 돕는 습관을 작게 반복합니다.",
          keywords: ["집중", "습관"],
        },
        {
          clusterId: "cluster-2",
          summary: "기록을 돌아보며 성찰의 방향을 정합니다.",
          keywords: ["기록", "성찰"],
        },
      ],
    },
    "structure-connection-pairs": {
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
    "recommendation-list-quality": {
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
    "keyword-list-quality": { keywords: ["집중", "습관", "기록"] },
    "generate-embedding-shape": { embedding: syntheticVector(23) },
  };
}
