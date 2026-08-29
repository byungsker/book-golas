import {
  type CandidateResults,
  type CandidateSource,
  type CaseResult,
  type ContractReceipt,
  EVALUATION_CONTRACT_VERSION,
  EVALUATION_FIXTURE_VERSION,
  EVALUATION_RUNNER_VERSION,
  type EvaluationCase,
  type EvaluationComponent,
  type EvaluationReport,
  EXPECTED_FIXTURE_SHA256,
  type JsonRecord,
  LLM_SURFACE_CONTRACTS,
  type SourceReceipt,
} from "./contracts.ts";
import { SYNTHETIC_EVAL_CASES } from "./fixtures.ts";

interface Grade {
  score: number;
  components: EvaluationComponent[];
  metrics: Record<string, number>;
  failureCodes: string[];
}

export interface EvaluateOptions {
  repoRoot: string;
  sourceCommit: string;
  candidates: CandidateResults;
  candidateSource: CandidateSource;
  readFile?: (path: string) => Promise<string>;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStrings(value: unknown): string[] {
  return asArray(value).filter((item): item is string =>
    typeof item === "string"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function asNumbers(value: unknown): number[] {
  return asArray(value).filter((item): item is number =>
    typeof item === "number"
  );
}

function rounded(value: number): number {
  return Number(value.toFixed(4));
}

function bounded(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return rounded(Math.max(0, Math.min(1, value)));
}

function f1Score(expected: string[], actual: string[]): number {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  if (
    expectedSet.size !== expected.length || actualSet.size !== actual.length
  ) {
    return 0;
  }
  if (expectedSet.size === 0 && actualSet.size === 0) return 1;
  if (expectedSet.size === 0 || actualSet.size === 0) return 0;
  let intersection = 0;
  for (const value of actualSet) {
    if (expectedSet.has(value)) intersection += 1;
  }
  const precision = intersection / actualSet.size;
  const recall = intersection / expectedSet.size;
  return precision + recall === 0
    ? 0
    : (2 * precision * recall) / (precision + recall);
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : bounded(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function component(name: string, score: number): EvaluationComponent {
  return { name, score: bounded(score), weight: 1 };
}

function gradeRecallAnswer(expected: JsonRecord, candidate: JsonRecord): Grade {
  const answer = typeof candidate.answer === "string" ? candidate.answer : "";
  const sourceIds = asStrings(candidate.sourceIds);
  const expectedSourceIds = asStrings(expected.sourceIds);
  const anchors = asStrings(expected.answerAnchors);
  const anchorCoverage = anchors.length === 0
    ? 1
    : anchors.filter((anchor) => answer.includes(anchor)).length /
      anchors.length;
  const sourceTypeScore = isStringArray(candidate.sourceIds) ? 1 : 0;
  const schemaScore = answer.length > 0 && sourceTypeScore === 1 ? 1 : 0;
  const sourceScore = sourceTypeScore === 1
    ? f1Score(expectedSourceIds, sourceIds)
    : 0;
  const score = average([
    schemaScore,
    sourceTypeScore,
    sourceScore,
    anchorCoverage,
  ]);
  const failureCodes: string[] = [];
  if (schemaScore < 1) failureCodes.push("invalid_answer_schema");
  if (sourceScore < 1) failureCodes.push("source_ids_mismatch");
  if (anchorCoverage < 1) failureCodes.push("answer_anchor_missing");
  return {
    score,
    components: [
      component("schema", schemaScore),
      component("source_id_types", sourceTypeScore),
      component("source_ids_f1", sourceScore),
      component("answer_anchor_coverage", anchorCoverage),
    ],
    metrics: {
      answerAnchorCoverage: rounded(anchorCoverage),
      sourceIdsF1: rounded(sourceScore),
    },
    failureCodes,
  };
}

function cosineScore(expected: number[], actual: number[]): number {
  if (expected.length === 0 || expected.length !== actual.length) return 0;
  if (!expected.every(Number.isFinite) || !actual.every(Number.isFinite)) {
    return 0;
  }
  let dot = 0;
  let expectedMagnitude = 0;
  let actualMagnitude = 0;
  for (let index = 0; index < expected.length; index += 1) {
    dot += expected[index] * actual[index];
    expectedMagnitude += expected[index] * expected[index];
    actualMagnitude += actual[index] * actual[index];
  }
  if (expectedMagnitude === 0 || actualMagnitude === 0) return 0;
  return bounded(dot / Math.sqrt(expectedMagnitude * actualMagnitude));
}

function gradeEmbedding(expected: JsonRecord, candidate: JsonRecord): Grade {
  const expectedDimension = typeof expected.dimension === "number"
    ? expected.dimension
    : 0;
  const expectedReference = asNumbers(expected.reference);
  const rawEmbedding = asArray(candidate.embedding);
  const embedding = asNumbers(candidate.embedding);
  const typeScore = Array.isArray(candidate.embedding) &&
      rawEmbedding.length === embedding.length
    ? 1
    : 0;
  const dimensionScore =
    typeScore === 1 && embedding.length === expectedDimension ? 1 : 0;
  const finiteScore = typeScore === 1 && embedding.length > 0 &&
      embedding.every(Number.isFinite)
    ? 1
    : 0;
  const similarity = cosineScore(expectedReference, embedding);
  const score = average([dimensionScore, typeScore, finiteScore, similarity]);
  const failureCodes: string[] = [];
  if (dimensionScore < 1) failureCodes.push("embedding_dimension_mismatch");
  if (typeScore < 1) failureCodes.push("embedding_contains_non_numeric_values");
  if (finiteScore < 1) failureCodes.push("embedding_non_finite_or_missing");
  if (similarity < 0.98) failureCodes.push("embedding_similarity_low");
  return {
    score,
    components: [
      component("dimension", dimensionScore),
      component("numeric_values", typeScore),
      component("finite_values", finiteScore),
      component("reference_cosine", similarity),
    ],
    metrics: {
      dimension: embedding.length,
      referenceDimension: expectedReference.length,
      referenceCosine: rounded(similarity),
    },
    failureCodes,
  };
}

function canonicalGroup(value: unknown): string[] {
  return asStrings(value).sort();
}

function gradeClassification(
  expected: JsonRecord,
  candidate: JsonRecord,
): Grade {
  const clusters = asArray(candidate.clusters).map((value) => record(value));
  const expectedNodeIds = asStrings(expected.nodeIds);
  const actualNodeIds = clusters.flatMap((cluster) =>
    asStrings(cluster.nodeIds)
  );
  const nodeScore = f1Score(expectedNodeIds, actualNodeIds) *
    (new Set(actualNodeIds).size === actualNodeIds.length ? 1 : 0.5);
  const expectedGroups = asArray(expected.groups).map(canonicalGroup);
  const actualGroups = clusters.map((cluster) =>
    canonicalGroup(cluster.nodeIds)
  );
  const remainingGroups = actualGroups.map((group) => group.join("\u0000"));
  let matchedGroups = 0;
  for (const group of expectedGroups) {
    const index = remainingGroups.indexOf(group.join("\u0000"));
    if (index >= 0) {
      matchedGroups += 1;
      remainingGroups.splice(index, 1);
    }
  }
  const groupScore = expectedGroups.length === 0
    ? 1
    : matchedGroups / expectedGroups.length;
  const expectedClusterCount = typeof expected.clusterCount === "number"
    ? expected.clusterCount
    : 0;
  const countScore = clusters.length === expectedClusterCount ? 1 : 0;
  const clusterIds = clusters.flatMap((cluster) =>
    typeof cluster.clusterId === "string" ? [cluster.clusterId] : []
  );
  const uniqueClusterIds = new Set(clusterIds).size === clusterIds.length;
  const schemaScore = clusters.length > 0 &&
      clusters.every((cluster) =>
        typeof cluster.clusterId === "string" &&
        typeof cluster.name === "string" && cluster.name.length > 0 &&
        isStringArray(cluster.nodeIds) && cluster.nodeIds.length >= 2 &&
        typeof cluster.confidence === "number" &&
        Number.isFinite(cluster.confidence) &&
        cluster.confidence >= 0 && cluster.confidence <= 1
      ) && uniqueClusterIds
    ? 1
    : 0;
  const score = average([nodeScore, groupScore, countScore, schemaScore]);
  const failureCodes: string[] = [];
  if (nodeScore < 1) failureCodes.push("node_assignment_mismatch");
  if (groupScore < 1) failureCodes.push("cluster_group_mismatch");
  if (countScore < 1) failureCodes.push("cluster_count_mismatch");
  if (schemaScore < 1) failureCodes.push("invalid_classification_schema");
  return {
    score,
    components: [
      component("node_assignment", nodeScore),
      component("group_match", groupScore),
      component("cluster_count", countScore),
      component("schema", schemaScore),
    ],
    metrics: {
      expectedNodeCount: expectedNodeIds.length,
      actualNodeCount: actualNodeIds.length,
      matchedGroups,
      expectedGroups: expectedGroups.length,
    },
    failureCodes,
  };
}

function gradeSummary(expected: JsonRecord, candidate: JsonRecord): Grade {
  const summaries = asArray(candidate.summaries).map((value) => record(value));
  const expectedClusterIds = asStrings(expected.clusterIds);
  const actualClusterIds = summaries.map((summary) =>
    typeof summary.clusterId === "string" ? summary.clusterId : ""
  );
  const clusterScore = f1Score(expectedClusterIds, actualClusterIds);
  const keywordAnchors = isRecord(expected.keywordAnchors)
    ? expected.keywordAnchors
    : {};
  const keywordCoverage = expectedClusterIds.length === 0
    ? 1
    : average(expectedClusterIds.map((clusterId) => {
      const summary = summaries.find((item) => item.clusterId === clusterId);
      const required = asStrings(keywordAnchors[clusterId]);
      const actual = summary ? asStrings(summary.keywords) : [];
      return f1Score(required, actual);
    }));
  const schemaScore = summaries.length > 0 &&
      summaries.every((summary) =>
        typeof summary.clusterId === "string" &&
        typeof summary.summary === "string" && summary.summary.length > 0 &&
        isStringArray(summary.keywords) && summary.keywords.length > 0
      )
    ? 1
    : 0;
  const score = average([clusterScore, keywordCoverage, schemaScore]);
  const failureCodes: string[] = [];
  if (clusterScore < 1) failureCodes.push("summary_cluster_mismatch");
  if (keywordCoverage < 1) failureCodes.push("summary_keyword_anchor_missing");
  if (schemaScore < 1) failureCodes.push("invalid_summary_schema");
  return {
    score,
    components: [
      component("cluster_ids_f1", clusterScore),
      component("keyword_anchor_coverage", keywordCoverage),
      component("schema", schemaScore),
    ],
    metrics: {
      clusterIdsF1: rounded(clusterScore),
      keywordAnchorCoverage: rounded(keywordCoverage),
      summaryCount: summaries.length,
    },
    failureCodes,
  };
}

function pairKey(from: string, to: string): string {
  return `${from}\u0000${to}`;
}

function expectedPairs(value: unknown): string[] {
  return asArray(value).flatMap((item) => {
    const pair = record(item);
    return typeof pair.from === "string" && typeof pair.to === "string"
      ? [pairKey(pair.from, pair.to)]
      : [];
  });
}

function gradeConnections(expected: JsonRecord, candidate: JsonRecord): Grade {
  const connections = asArray(candidate.connections).map((value) =>
    record(value)
  );
  const actualPairs = connections.flatMap((connection) =>
    typeof connection.fromNodeId === "string" &&
      typeof connection.toNodeId === "string"
      ? [pairKey(connection.fromNodeId, connection.toNodeId)]
      : []
  );
  const pairScore = f1Score(expectedPairs(expected.pairs), actualPairs);
  const schemaScore = connections.length > 0 &&
      connections.every((connection) =>
        typeof connection.fromNodeId === "string" &&
        typeof connection.toNodeId === "string" &&
        typeof connection.reason === "string" && connection.reason.length > 0
      )
    ? 1
    : 0;
  const score = average([pairScore, schemaScore]);
  const failureCodes: string[] = [];
  if (pairScore < 1) failureCodes.push("connection_pair_mismatch");
  if (schemaScore < 1) failureCodes.push("invalid_connection_schema");
  return {
    score,
    components: [
      component("directed_pairs_f1", pairScore),
      component("schema", schemaScore),
    ],
    metrics: {
      directedPairsF1: rounded(pairScore),
      expectedPairCount: expectedPairs(expected.pairs).length,
      actualPairCount: actualPairs.length,
    },
    failureCodes,
  };
}

function gradeRecommendations(
  expected: JsonRecord,
  candidate: JsonRecord,
): Grade {
  const recommendations = asArray(candidate.recommendations).map((value) =>
    record(value)
  );
  const expectedCount = typeof expected.count === "number" ? expected.count : 0;
  const countScore = recommendations.length === expectedCount ? 1 : 0;
  const requiredTerms = asStrings(expected.requiredTerms).map((term) =>
    term.toLowerCase()
  );
  const searchableText = recommendations.map((recommendation) =>
    [recommendation.title, recommendation.author, recommendation.reason]
      .filter((value): value is string => typeof value === "string")
      .concat(asStrings(recommendation.keywords))
      .join(" ")
      .toLowerCase()
  ).join(" ");
  const termScore = requiredTerms.length === 0
    ? 1
    : requiredTerms.filter((term) => searchableText.includes(term)).length /
      requiredTerms.length;
  const expectedTitles = asStrings(expected.requiredTitles);
  const actualTitles = recommendations.flatMap((recommendation) =>
    typeof recommendation.title === "string" ? [recommendation.title] : []
  );
  const titleScore = f1Score(expectedTitles, actualTitles);
  const uniqueTitles = new Set(actualTitles).size === actualTitles.length;
  const uniqueKeywordSets = recommendations.every((recommendation) => {
    const keywords = asStrings(recommendation.keywords);
    return new Set(keywords).size === keywords.length;
  });
  const schemaScore = recommendations.length > 0 &&
      recommendations.every((recommendation) =>
        typeof recommendation.title === "string" &&
        recommendation.title.length > 0 &&
        typeof recommendation.author === "string" &&
        recommendation.author.length > 0 &&
        typeof recommendation.reason === "string" &&
        recommendation.reason.length > 0 &&
        isStringArray(recommendation.keywords) &&
        recommendation.keywords.length > 0
      ) && uniqueTitles && uniqueKeywordSets
    ? 1
    : 0;
  const score = average([countScore, termScore, titleScore, schemaScore]);
  const failureCodes: string[] = [];
  if (countScore < 1) failureCodes.push("recommendation_count_mismatch");
  if (termScore < 1) failureCodes.push("recommendation_term_missing");
  if (titleScore < 1) failureCodes.push("recommendation_title_mismatch");
  if (schemaScore < 1) failureCodes.push("invalid_recommendation_schema");
  return {
    score,
    components: [
      component("count", countScore),
      component("required_term_coverage", termScore),
      component("required_title_f1", titleScore),
      component("schema", schemaScore),
    ],
    metrics: {
      expectedCount,
      actualCount: recommendations.length,
      requiredTermCoverage: rounded(termScore),
      requiredTitleF1: rounded(titleScore),
    },
    failureCodes,
  };
}

function gradeKeywords(expected: JsonRecord, candidate: JsonRecord): Grade {
  const keywords = asStrings(candidate.keywords);
  const required = asStrings(expected.required);
  const maxItems = typeof expected.maxItems === "number"
    ? expected.maxItems
    : 0;
  const qualityScore = f1Score(required, keywords);
  const schemaScore = isStringArray(candidate.keywords) &&
      keywords.length <= maxItems &&
      new Set(keywords).size === keywords.length
    ? 1
    : 0;
  const score = average([qualityScore, schemaScore]);
  const failureCodes: string[] = [];
  if (qualityScore < 1) failureCodes.push("keyword_set_mismatch");
  if (schemaScore < 1) failureCodes.push("invalid_keyword_schema");
  return {
    score,
    components: [
      component("keyword_f1", qualityScore),
      component("schema", schemaScore),
    ],
    metrics: {
      keywordF1: rounded(qualityScore),
      keywordCount: keywords.length,
      maxItems,
    },
    failureCodes,
  };
}

function record(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function gradeCase(testCase: EvaluationCase, output: JsonRecord): Grade {
  switch (testCase.surface) {
    case "recall-search.answer":
      return gradeRecallAnswer(testCase.expected, output);
    case "recall-search.embedding":
    case "generate-embedding.embedding":
      return gradeEmbedding(testCase.expected, output);
    case "structure-notes.classification":
      return gradeClassification(testCase.expected, output);
    case "structure-notes.summary":
      return gradeSummary(testCase.expected, output);
    case "structure-notes.connection":
      return gradeConnections(testCase.expected, output);
    case "recommend-next-books.recommendation":
      return gradeRecommendations(testCase.expected, output);
    case "extract-keywords.chat":
      return gradeKeywords(testCase.expected, output);
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest)).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function readSourceReceipts(
  repoRoot: string,
  readFile: (path: string) => Promise<string>,
): Promise<SourceReceipt[]> {
  const root = repoRoot.replace(/\/$/, "");
  const receipts: SourceReceipt[] = [];
  for (const contract of LLM_SURFACE_CONTRACTS) {
    for (const source of contract.sourceFiles) {
      const absolutePath = `${root}/${source.path}`;
      try {
        const sourceText = await readFile(absolutePath);
        const markersFound = source.markers.filter((marker) =>
          sourceText.includes(marker)
        ).length;
        receipts.push({
          surface: contract.id,
          path: source.path,
          sha256: await sha256Hex(sourceText),
          markersExpected: source.markers.length,
          markersFound,
          status: markersFound === source.markers.length ? "pass" : "fail",
        });
      } catch {
        receipts.push({
          surface: contract.id,
          path: source.path,
          sha256: null,
          markersExpected: source.markers.length,
          markersFound: 0,
          status: "fail",
        });
      }
    }
  }
  return receipts;
}

function contractReceipts(sourceReceipts: SourceReceipt[]): ContractReceipt[] {
  return LLM_SURFACE_CONTRACTS.map((contract) => ({
    id: contract.id,
    functionName: contract.functionName,
    provider: contract.provider,
    model: contract.model,
    promptId: contract.promptId,
    inputSchema: contract.inputSchema,
    outputSchema: contract.outputSchema,
    sourceFiles: sourceReceipts.filter((receipt) =>
      receipt.surface === contract.id
    ),
  }));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function evaluateRun(
  options: EvaluateOptions,
): Promise<EvaluationReport> {
  if (!/^[0-9a-f]{40}$/i.test(options.sourceCommit)) {
    throw new Error("source_commit_must_be_40_hex_characters");
  }
  const readFile = options.readFile ??
    ((path: string) => Deno.readTextFile(path));
  const sourceReceipts = await readSourceReceipts(options.repoRoot, readFile);
  const contracts = contractReceipts(sourceReceipts);
  const sourceContractPassed = sourceReceipts.every((receipt) =>
    receipt.status === "pass"
  );
  const candidates = options.candidates;
  const cases: CaseResult[] = SYNTHETIC_EVAL_CASES.map((testCase) => {
    const candidate = record(candidates[testCase.id]);
    const candidateGrade = gradeCase(testCase, candidate);
    const baselineGrade = gradeCase(testCase, testCase.baseline);
    const regression = bounded(baselineGrade.score - candidateGrade.score);
    const failureCodes = [...candidateGrade.failureCodes];
    if (candidateGrade.score < testCase.minimumScore) {
      failureCodes.push("below_minimum_score");
    }
    if (regression > testCase.maxRegression) {
      failureCodes.push("regression_limit_exceeded");
    }
    return {
      id: testCase.id,
      surface: testCase.surface,
      score: candidateGrade.score,
      baselineScore: baselineGrade.score,
      minimumScore: testCase.minimumScore,
      maxRegression: testCase.maxRegression,
      regression,
      regressionExceeded: regression > testCase.maxRegression,
      components: candidateGrade.components,
      metrics: candidateGrade.metrics,
      failureCodes: [...new Set(failureCodes)],
    };
  });
  const totalWeight = SYNTHETIC_EVAL_CASES.reduce(
    (total, testCase) => total + testCase.weight,
    0,
  );
  const weightedScore = bounded(
    cases.reduce(
      (total, result, index) =>
        total + result.score * SYNTHETIC_EVAL_CASES[index].weight,
      0,
    ) / totalWeight,
  );
  const baselineWeightedScore = bounded(
    cases.reduce(
      (total, result, index) =>
        total + result.baselineScore * SYNTHETIC_EVAL_CASES[index].weight,
      0,
    ) / totalWeight,
  );
  const overallRegression = bounded(baselineWeightedScore - weightedScore);
  const fixtureSha256 = await sha256Hex(canonicalJson(SYNTHETIC_EVAL_CASES));
  const fixtureIntegrityPassed = fixtureSha256 === EXPECTED_FIXTURE_SHA256;
  const failedCases =
    cases.filter((result) => result.failureCodes.length > 0).length;
  const failureClasses: string[] = [];
  if (!sourceContractPassed) failureClasses.push("source_contract");
  if (
    cases.some((result) => result.failureCodes.includes("below_minimum_score"))
  ) {
    failureClasses.push("case_threshold");
  }
  if (
    cases.some((result) =>
      result.failureCodes.includes("regression_limit_exceeded")
    )
  ) {
    failureClasses.push("case_regression");
  }
  if (weightedScore < 0.9) failureClasses.push("overall_score");
  if (overallRegression > 0.05) failureClasses.push("overall_regression");
  if (!fixtureIntegrityPassed) failureClasses.push("fixture_integrity");
  const reportWithoutHash: Omit<EvaluationReport, "reportSha256"> = {
    schemaVersion: EVALUATION_CONTRACT_VERSION,
    run: {
      environment: "synthetic" as const,
      sourceCommit: options.sourceCommit,
      fixtureVersion: EVALUATION_FIXTURE_VERSION,
      runnerVersion: EVALUATION_RUNNER_VERSION,
      fixtureSha256,
      fixtureIntegrityPassed,
      candidateSource: options.candidateSource,
      providerCalls: 0 as const,
      liveProviderCalls: false as const,
    },
    contracts,
    cases,
    summary: {
      totalCases: cases.length,
      passedCases: cases.length - failedCases,
      failedCases,
      weightedScore,
      baselineWeightedScore,
      overallRegression,
      minimumOverallScore: 0.9,
      maxOverallRegression: 0.05,
      sourceContractPassed,
      promotionGate: failureClasses.length === 0
        ? "pass" as const
        : "block" as const,
      failureClasses,
    },
  };
  const reportSha256 = await sha256Hex(canonicalJson(reportWithoutHash));
  return { ...reportWithoutHash, reportSha256 };
}
