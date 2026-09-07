import assert from "node:assert/strict"
import test from "node:test"
import { evidencePath } from "../../scripts/evidence.mjs"

test("task evidence path stays inside the repository evidence namespace", () => {
  const path = evidencePath(5)

  assert.match(path, /\.omo\/evidence\/bookgolas-web-app-parity\/task-5-bookgolas-web-app-parity\.json$/)
  assert.throws(() => evidencePath(0), /positive integer/)
  assert.throws(() => evidencePath(5, "json/escape"), /alphanumeric/)
})
