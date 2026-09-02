import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("machine-readable manifest and package version agree", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "../agent-api/capabilities.json"), "utf8"));
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const responseSchema = JSON.parse(await readFile(resolve(root, "schemas/agent-response.schema.json"), "utf8"));
  const errorSchema = JSON.parse(await readFile(resolve(root, "schemas/agent-error.schema.json"), "utf8"));
  const capabilitySchema = JSON.parse(await readFile(resolve(root, "schemas/agent-capabilities.schema.json"), "utf8"));
  assert.equal(manifest.contract_version, packageJson.version);
  assert.equal(manifest.mode, "read_only");
  assert.equal(manifest.writes.enabled, false);
  assert.equal(manifest.capabilities.length, 5);
  assert.deepEqual(manifest.capabilities.map((item) => item.method), ["GET", "GET", "GET", "GET", "GET"]);
  assert.ok(responseSchema.properties.meta.properties.pagination);
  assert.ok(errorSchema.properties.error.properties.request_id);
  assert.ok(errorSchema.properties.error.properties.details);
  assert.equal(capabilitySchema.properties.data.properties.mode.const, "read_only");
});

test("CLI source has no direct Supabase or database client dependency", async () => {
  const source = await readFile(resolve(root, "src/client.mjs"), "utf8");
  const entry = await readFile(resolve(root, "bin/bookgolas.mjs"), "utf8");
  assert.doesNotMatch(`${source}\n${entry}`, /supabase|postgres|sqlite|database/i);
});
