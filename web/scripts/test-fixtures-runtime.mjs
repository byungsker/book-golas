import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const resetScript = path.join(repositoryRoot, "web/scripts/reset-local-fixtures.mjs");
const manifest = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, "web/fixtures/supabase/consumer-fixtures.json"),
  "utf8",
));
const expectedObjects = manifest.images.map((image) => ({
  path: image.storage_path,
  asset: fs.readFileSync(path.resolve(repositoryRoot, image.asset_path)),
}));

const reset = spawnSync(process.execPath, [resetScript], {
  cwd: repositoryRoot,
  stdio: "inherit",
});
if (reset.error) {
  console.error(`fixture runtime reset could not start: ${reset.error.message}`);
  process.exit(1);
}
if (reset.status !== 0) process.exit(reset.status ?? 1);

const status = spawnSync("supabase", ["status", "--output", "env"], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
if (status.error || status.status !== 0) {
  console.error(`fixture runtime status could not be read: ${status.error?.message ?? "status command failed"}`);
  process.exit(status.status ?? 1);
}

const localEnv = new Map();
for (const line of status.stdout.split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) localEnv.set(match[1], match[2].replace(/^"|"$/g, ""));
}

const apiUrl = localEnv.get("API_URL");
const serviceRoleKey = localEnv.get("SERVICE_ROLE_KEY");
if (!apiUrl || !serviceRoleKey) {
  console.error("fixture runtime status did not provide API_URL and SERVICE_ROLE_KEY");
  process.exit(1);
}

const parsedApiUrl = new URL(apiUrl);
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedApiUrl.hostname)) {
  console.error("fixture runtime verification requires a loopback API URL");
  process.exit(1);
}

const supabaseAdmin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const bucket = supabaseAdmin.storage.from("book-images");

for (const expected of expectedObjects) {
  const directory = expected.path.slice(0, expected.path.lastIndexOf("/"));
  const filename = expected.path.slice(expected.path.lastIndexOf("/") + 1);
  const { data: entries, error: listError } = await bucket.list(directory, {
    limit: 10,
    search: filename,
  });
  if (listError) {
    console.error(`fixture runtime storage list failed for ${directory}/${filename}: ${listError.message}`);
    process.exit(1);
  }
  if (!entries?.some((entry) => entry.name === filename)) {
    console.error(`fixture runtime storage object is missing: ${directory}/${filename}`);
    process.exit(1);
  }

  const { data: downloaded, error: downloadError } = await bucket.download(`${directory}/${filename}`);
  if (downloadError) {
    console.error(`fixture runtime storage download failed for ${directory}/${filename}: ${downloadError.message}`);
    process.exit(1);
  }
  const contents = Buffer.from(await downloaded.arrayBuffer());
  if (!contents.equals(expected.asset)) {
    console.error(`fixture runtime storage bytes differ for ${directory}/${filename}`);
    process.exit(1);
  }
}

console.log(
  `fixture runtime contract passed: verified_objects=${expectedObjects
    .map((expected) => expected.path)
    .join(",")} bytes=${expectedObjects[0]?.asset.length ?? 0}`,
);
