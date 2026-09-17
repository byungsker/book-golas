import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const fixtureManifest = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, "web/fixtures/supabase/consumer-fixtures.json"),
  "utf8",
));
const projectConfig = fs.readFileSync(
  path.join(repositoryRoot, "supabase/config.toml"),
  "utf8",
);
const projectId = projectConfig.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
if (!projectId) {
  console.error("local Supabase project id could not be read");
  process.exit(1);
}

const result = spawnSync(
  "supabase",
  ["db", "reset", "--local", "--sql-paths", "../web/fixtures/supabase/seed.sql", "--yes"],
  { cwd: repositoryRoot, stdio: "inherit" },
);

if (result.error) {
  console.error(`local Supabase reset could not start: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const readLocalEnv = () => {
  const status = spawnSync("supabase", ["status", "--output", "env"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (status.error || status.status !== 0) {
    console.error(`local Supabase status could not be read: ${status.error?.message ?? "status command failed"}`);
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
    console.error("local Supabase status did not provide API_URL and SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const parsedApiUrl = new URL(apiUrl);
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedApiUrl.hostname)) {
    console.error("local Supabase storage upload requires a loopback API URL");
    process.exit(1);
  }

  return { apiUrl, serviceRoleKey };
};

const restartLocalSupabase = () => {
  const stop = spawnSync("supabase", ["stop", "--project-id", projectId], {
    cwd: repositoryRoot,
    stdio: "ignore",
  });
  if (stop.error || stop.status !== 0) return false;

  const start = spawnSync("supabase", ["start", "--yes"], {
    cwd: repositoryRoot,
    stdio: "ignore",
  });
  return !start.error && start.status === 0;
};

const createLocalAdminClient = ({ apiUrl, serviceRoleKey }) => createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
  },
});

let localEnv = readLocalEnv();
let supabaseAdmin = createLocalAdminClient(localEnv);
for (const image of fixtureManifest.images) {
  const asset = fs.readFileSync(path.resolve(repositoryRoot, image.asset_path));
  const storagePath = image.storage_path;
  let uploaded = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabaseAdmin.storage.from("book-images").upload(storagePath, asset, {
      contentType: "image/png",
      upsert: true,
    });
    if (!error) {
      uploaded = true;
      break;
    }
    if (attempt === 0 && restartLocalSupabase()) {
      localEnv = readLocalEnv();
      supabaseAdmin = createLocalAdminClient(localEnv);
      continue;
    }
    console.error(`local Supabase storage fixture upload failed for ${storagePath}: ${error.message}`);
    process.exit(1);
  }
  if (!uploaded) {
    console.error(`local Supabase storage fixture upload did not complete for ${storagePath}`);
    process.exit(1);
  }
}

console.log("local Supabase fixtures reset and uploaded: 2 users, 2 books, 2 images");
