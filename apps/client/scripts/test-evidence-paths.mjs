import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { evidenceDirectory, taskEvidenceDirectory } from "./evidence.mjs";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const visualEvidenceRelativePath = "apps/client/docs/evidence/bookgolas-web-app-parity";
const taskEvidenceRelativePath = ".omo/evidence/bookgolas-web-app-parity";
const failures = [];
/** Collect a validation failure without stopping the remaining checks. */
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

requireCondition(fs.existsSync(evidenceDirectory), "visual evidence directory is missing");
const sumsPath = path.join(evidenceDirectory, "SHA256SUMS");
requireCondition(fs.existsSync(sumsPath), "SHA256SUMS is missing");
requireCondition(fs.existsSync(path.join(evidenceDirectory, "final-verification.md")), "final verification record is missing");
requireCondition(fs.existsSync(taskEvidenceDirectory), "task evidence directory is missing");
const taskSumsPath = path.join(taskEvidenceDirectory, "SHA256SUMS");
requireCondition(fs.existsSync(taskSumsPath), "task SHA256SUMS is missing");
requireCondition(
  fs.existsSync(path.join(taskEvidenceDirectory, "task-5-bookgolas-web-app-parity.json")),
  "task evidence record is missing",
);
requireCondition(
  fs.existsSync(path.join(taskEvidenceDirectory, "final-verification.md")),
  "task final verification record is missing",
);

/** Validate scope, containment, existence and digest for one evidence manifest. */
function validateChecksumManifest(manifestPath, allowedRelativePath, label) {
  if (!fs.existsSync(manifestPath)) return;

  const allowedDirectory = path.resolve(repositoryRoot, allowedRelativePath);
  const entries = fs.readFileSync(manifestPath, "utf8").trim().split("\n").filter(Boolean);
  requireCondition(entries.length > 0, `${label} SHA256SUMS is empty`);
  for (const entry of entries) {
    const [, expectedDigest, relativePath] = entry.match(/^([0-9a-f]{64})  (.+)$/i) ?? [];
    requireCondition(Boolean(expectedDigest && relativePath), `malformed checksum entry: ${entry}`);
    if (!expectedDigest || !relativePath) continue;

    const targetPath = path.resolve(repositoryRoot, relativePath);
    const repositoryRelativePath = path.relative(repositoryRoot, targetPath);
    const allowedDirectoryRelativePath = path.relative(allowedDirectory, targetPath);
    requireCondition(
      allowedDirectoryRelativePath !== "" &&
        allowedDirectoryRelativePath !== ".." &&
        !allowedDirectoryRelativePath.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(allowedDirectoryRelativePath),
      `evidence path escapes allowed directory: ${relativePath}`,
    );
    requireCondition(
      repositoryRelativePath !== "" &&
        repositoryRelativePath !== ".." &&
        !repositoryRelativePath.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(repositoryRelativePath),
      `evidence path is not repository relative: ${relativePath}`,
    );
    requireCondition(fs.existsSync(targetPath), `checksum target is missing: ${relativePath}`);
    if (fs.existsSync(targetPath)) {
      const actualDigest = crypto.createHash("sha256").update(fs.readFileSync(targetPath)).digest("hex");
      requireCondition(actualDigest === expectedDigest.toLowerCase(), `checksum mismatch: ${relativePath}`);
    }
  }
}

validateChecksumManifest(sumsPath, visualEvidenceRelativePath, "visual evidence");
validateChecksumManifest(taskSumsPath, taskEvidenceRelativePath, "task evidence");

const releaseConfigPath = path.join(repositoryRoot, "web/docs/consumer-web-release-config.json");
let completionEvidence = {};
try {
  completionEvidence = JSON.parse(fs.readFileSync(releaseConfigPath, "utf8")).completionPreflight?.evidence ?? {};
} catch {
  failures.push("completion release config is missing or invalid");
}

const args = process.argv.slice(2);
const fixtureIndex = args.indexOf("--fixture");
const fixtureName = fixtureIndex < 0 ? "" : args[fixtureIndex + 1];
const fixturePaths = {
  "missing-receipt": ".omo/evidence/bookgolas-web-completion/missing.md",
  "mislocated-receipt": "web/docs/evidence/mislocated-receipt.md",
  "generated-artifact": ".next/cache/task-5-bookgolas-web-completion.md",
  "empty-receipt": completionEvidence.receipt,
};
if (fixtureName && !Object.hasOwn(fixturePaths, fixtureName)) failures.push(`unknown evidence-path fixture: ${fixtureName}`);
const receiptPath = fixturePaths[fixtureName] ?? completionEvidence.receipt;
const evidenceDirectoryPath = typeof completionEvidence.directory === "string"
  ? path.resolve(repositoryRoot, completionEvidence.directory)
  : repositoryRoot;
const rejectedPathComponents = completionEvidence.rejectedPathComponents;
const requiredSections = completionEvidence.requiredSections;

requireCondition(typeof completionEvidence.directory === "string", "completion evidence directory is missing");
requireCondition(typeof receiptPath === "string", "completion evidence receipt is missing");
requireCondition(Array.isArray(rejectedPathComponents) && rejectedPathComponents.length > 0, "completion rejected evidence path components are missing");
requireCondition(Array.isArray(requiredSections) && requiredSections.length > 0, "completion evidence receipt sections are missing");

if (typeof receiptPath === "string") {
  const receiptAbsolutePath = path.resolve(repositoryRoot, receiptPath);
  const repositoryRelativePath = path.relative(repositoryRoot, receiptAbsolutePath);
  const evidenceRelativePath = path.relative(evidenceDirectoryPath, receiptAbsolutePath);
  requireCondition(!path.isAbsolute(receiptPath), `completion evidence path must be repository-relative: ${receiptPath}`);
  requireCondition(
    repositoryRelativePath !== "" && repositoryRelativePath !== ".." && !repositoryRelativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(repositoryRelativePath),
    `completion evidence path escapes repository: ${receiptPath}`,
  );
  requireCondition(
    evidenceRelativePath !== "" && evidenceRelativePath !== ".." && !evidenceRelativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(evidenceRelativePath),
    `completion evidence receipt is mislocated: ${receiptPath}`,
  );
  requireCondition(path.extname(receiptPath) === ".md", `completion evidence receipt must be Markdown: ${receiptPath}`);
  for (const component of rejectedPathComponents ?? []) {
    requireCondition(!receiptPath.split(/[\\/]/).includes(component), `completion evidence uses generated or cached artifact directory: ${component}`);
  }
  requireCondition(fs.existsSync(receiptAbsolutePath), `completion evidence receipt is missing: ${receiptPath}`);
  if (fs.existsSync(receiptAbsolutePath)) {
    const stats = fs.lstatSync(receiptAbsolutePath);
    const contents = fixtureName === "empty-receipt" ? "" : fs.readFileSync(receiptAbsolutePath, "utf8");
    requireCondition(stats.isFile() && !stats.isSymbolicLink(), `completion evidence receipt must be a regular file: ${receiptPath}`);
    requireCondition(contents.trim().length > 0, `completion evidence receipt is empty: ${receiptPath}`);
    for (const section of requiredSections ?? []) {
      requireCondition(contents.includes(section), `completion evidence receipt is missing required section: ${section}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`evidence paths passed: directory=${completionEvidence.directory} receipt=${receiptPath} sections=${requiredSections.join(",")} repository_relative=true scoped=true hashed=true present=true`);
