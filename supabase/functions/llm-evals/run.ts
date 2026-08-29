import type { CandidateResults } from "./contracts.ts";
import { syntheticCandidateResults } from "./candidate.ts";
import { evaluateRun } from "./evaluator.ts";

function valueFor(flag: string): string | undefined {
  const index = Deno.args.indexOf(flag);
  return index >= 0 ? Deno.args[index + 1] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCandidates(value: unknown): CandidateResults {
  if (!isRecord(value)) return {};
  const results = isRecord(value.results) ? value.results : value;
  return results as CandidateResults;
}

const sourceCommit = valueFor("--commit");
if (!sourceCommit) {
  console.error(
    "usage: deno run --allow-read supabase/functions/llm-evals/run.ts --commit <40-char-sha> [--candidate <json>] [--root <repo-root>]",
  );
  Deno.exitCode = 2;
} else {
  try {
    const candidatePath = valueFor("--candidate") ?? "synthetic";
    const usesSyntheticCandidate = candidatePath === "synthetic";
    const candidateJson = usesSyntheticCandidate
      ? undefined
      : JSON.parse(await Deno.readTextFile(candidatePath));
    const report = await evaluateRun({
      repoRoot: valueFor("--root") ?? Deno.cwd(),
      sourceCommit,
      candidates: usesSyntheticCandidate
        ? syntheticCandidateResults()
        : parseCandidates(candidateJson),
      candidateSource: usesSyntheticCandidate ? "synthetic" : "external-file",
    });
    console.log(JSON.stringify(report, null, 2));
    if (report.summary.promotionGate !== "pass") Deno.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
