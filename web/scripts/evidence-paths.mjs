import { access, readFile } from "node:fs/promises"
import { evidencePath } from "./evidence.mjs"

const requiredEvidence = evidencePath(5)

async function main() {
  await access(requiredEvidence)
  const parsed = JSON.parse(await readFile(requiredEvidence, "utf8"))
  const requiredFields = ["task", "issue", "red", "green", "surface", "cleanup", "planFooter"]
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Evidence is missing ${field}`)
    }
  }
  if (parsed.task !== 5 || parsed.issue !== 414) {
    throw new Error("Evidence task metadata does not match issue #414")
  }
  if (parsed.planFooter !== "Plan: .omo/plans/bookgolas-web-app-parity.md") {
    throw new Error("Evidence plan footer is not canonical")
  }
  console.log(`Evidence path OK: ${requiredEvidence}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Evidence path validation failed")
  process.exitCode = 1
})
