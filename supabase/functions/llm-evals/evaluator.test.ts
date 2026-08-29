import { syntheticCandidateResults } from "./candidate.ts";
import { evaluateRun } from "./evaluator.ts";

const SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message);
  }
}

Deno.test("synthetic baseline is reproducible and passes the gate", async () => {
  const candidates = syntheticCandidateResults();
  const first = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates,
    candidateSource: "synthetic",
  });
  const second = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates,
    candidateSource: "synthetic",
  });

  assertEqual(first, second, "same inputs must produce the same report");
  assert(first.summary.promotionGate === "pass", "baseline must pass");
  assert(first.summary.weightedScore === 1, "baseline score must be 1");
  assert(first.summary.failedCases === 0, "baseline must have no failed cases");
  assert(first.reportSha256.length === 64, "report hash must be sha256");
});

Deno.test("quality degradation blocks promotion", async () => {
  const candidates = syntheticCandidateResults();
  candidates["keyword-list-quality"] = { keywords: ["무관한 단어"] };
  const report = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates,
    candidateSource: "synthetic",
  });

  assert(report.summary.promotionGate === "block", "degradation must block");
  assert(report.summary.failedCases > 0, "degradation must fail a case");
  assert(
    report.summary.failureClasses.includes("case_threshold"),
    "threshold failure must be classified",
  );
  assert(
    report.summary.failureClasses.includes("case_regression"),
    "regression failure must be classified",
  );
});

Deno.test("malformed duplicate outputs cannot receive full credit", async () => {
  const candidates = syntheticCandidateResults();
  candidates["recall-answer-relevance"] = {
    answer: "집중 기록",
    sourceIds: ["record-1", "record-1"],
  };
  const report = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates,
    candidateSource: "synthetic",
  });
  const result = report.cases.find((item) =>
    item.id === "recall-answer-relevance"
  );

  assert(result !== undefined, "recall case must be present");
  assert(result.score < 1, "duplicate source IDs must reduce the score");
  assert(
    result.failureCodes.includes("regression_limit_exceeded"),
    "duplicate source IDs must be classified as regression",
  );
});

Deno.test("source contracts cover every registered surface", async () => {
  const report = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates: syntheticCandidateResults(),
    candidateSource: "synthetic",
  });

  assert(
    report.contracts.length === 8,
    "eight LLM surfaces must be registered",
  );
  assert(report.summary.sourceContractPassed, "source markers must be present");
  assert(
    report.contracts.every((contract) =>
      contract.sourceFiles.every((source) =>
        source.status === "pass" && source.sha256?.length === 64
      )
    ),
    "every source receipt must pass",
  );
});

Deno.test("report excludes synthetic inputs and candidate outputs", async () => {
  const report = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates: syntheticCandidateResults(),
    candidateSource: "synthetic",
  });
  const serialized = JSON.stringify(report);

  assert(
    !serialized.includes("집중을 돕는 독서 기록"),
    "fixture input must not be serialized",
  );
  assert(
    !serialized.includes("집중을 유지하려면"),
    "candidate output must not be serialized",
  );
  assert(report.run.providerCalls === 0, "evaluation must not call a provider");
  assert(
    !report.run.liveProviderCalls,
    "live provider calls must remain disabled",
  );
});
