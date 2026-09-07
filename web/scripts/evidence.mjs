import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const evidenceRoot = resolve(repositoryRoot, ".omo/evidence/bookgolas-web-app-parity")

export function evidencePath(taskNumber, extension = "json") {
  if (!Number.isInteger(taskNumber) || taskNumber < 1) {
    throw new Error("Evidence task number must be a positive integer")
  }
  if (!/^[a-z0-9]+$/.test(extension)) {
    throw new Error("Evidence extension must be alphanumeric")
  }
  return resolve(evidenceRoot, `task-${taskNumber}-bookgolas-web-app-parity.${extension}`)
}

export async function writeEvidence(taskNumber, evidence, extension = "json") {
  const outputPath = evidencePath(taskNumber, extension)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8")
  return outputPath
}
