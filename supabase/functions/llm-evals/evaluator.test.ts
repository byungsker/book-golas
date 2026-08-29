import type { CandidateResults } from "./contracts.ts";
import { evaluateRun } from "./evaluator.ts";
import { SYNTHETIC_EVAL_CASES } from "./fixtures.ts";

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

function baselineCandidates(): CandidateResults {
  return Object.fromEntries(
    SYNTHETIC_EVAL_CASES.map((testCase) => [testCase.id, testCase.baseline]),
  );
}

Deno.test("synthetic baseline is reproducible and passes the gate", async () => {
  const candidates = baselineCandidates();
  const first = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates,
  });
  const second = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates,
  });

  assertEqual(first, second, "same inputs must produce the same report");
  assert(first.summary.promotionGate === "pass", "baseline must pass");
  assert(first.summary.weightedScore === 1, "baseline score must be 1");
  assert(first.summary.failedCases === 0, "baseline must have no failed cases");
  assert(first.reportSha256.length === 64, "report hash must be sha256");
});

Deno.test("quality degradation blocks promotion", async () => {
  const candidates = baselineCandidates();
  candidates["keyword-list-quality"] = { keywords: ["무관한 단어"] };
  const report = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates,
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

Deno.test("source contracts cover every registered surface", async () => {
  const report = await evaluateRun({
    repoRoot: Deno.cwd(),
    sourceCommit: SOURCE_COMMIT,
    candidates: baselineCandidates(),
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
    candidates: baselineCandidates(),
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
