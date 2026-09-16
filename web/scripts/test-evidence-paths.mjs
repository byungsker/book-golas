import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { evidenceDirectory, taskEvidenceDirectory } from "./evidence.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const visualEvidenceRelativePath = "web/docs/evidence/bookgolas-web-app-parity";
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

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("evidence paths passed: repository-relative, scoped, hashed and present");
