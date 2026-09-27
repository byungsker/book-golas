import path from "node:path";

export const evidenceDirectory = path.resolve(
  import.meta.dirname,
  "../docs/evidence/bookgolas-web-app-parity",
);

export const taskEvidenceDirectory = path.resolve(
  import.meta.dirname,
  "../../.omo/evidence/bookgolas-web-app-parity",
);

/** Resolve a path inside the visual browser evidence directory. */
export function evidencePath(...parts) {
  const resolved = path.resolve(evidenceDirectory, ...parts);
  if (!resolved.startsWith(`${evidenceDirectory}${path.sep}`)) {
    throw new Error("evidence path escapes the task evidence directory");
  }
  return resolved;
}

/** Resolve a path inside the task evidence directory. */
export function taskEvidencePath(...parts) {
  const resolved = path.resolve(taskEvidenceDirectory, ...parts);
  if (!resolved.startsWith(`${taskEvidenceDirectory}${path.sep}`)) {
    throw new Error("task evidence path escapes the task evidence directory");
  }
  return resolved;
}
