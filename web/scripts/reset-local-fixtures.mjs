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

const localDockerContext = process.env.BOOKGOLAS_LOCAL_DOCKER_CONTEXT ?? "colima";
const dockerInfoCommand = `docker --context ${localDockerContext} info --format {{.ServerVersion}}`;
const supabaseCliArguments = ["--yes", "supabase@2.108.0"];

function reportDockerBlocked(detail) {
  console.error(`local fixture preflight BLOCKED: owner=local Colima operator; missing_dependency=local Docker daemon/socket; command=${dockerInfoCommand}; timeout_ms=15000; next_step=start Colima, wait for the local socket, then rerun npm run test:fixtures:runtime; detail=${detail}`);
  process.exit(1);
}

function requireLocalDocker() {
  const context = spawnSync("docker", ["context", "inspect", localDockerContext, "--format", "{{.Endpoints.docker.Host}}"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 5_000,
  });
  const endpoint = context.stdout?.trim() ?? "";
  if (context.error || context.status !== 0 || !endpoint.startsWith("unix://")) {
    reportDockerBlocked(context.error?.message ?? context.stderr?.trim() ?? `local context endpoint is unavailable: ${endpoint || "none"}`);
  }
  const info = spawnSync("docker", ["--context", localDockerContext, "info", "--format", "{{.ServerVersion}}"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 15_000,
  });
  if (info.error || info.status !== 0) reportDockerBlocked(info.error?.message ?? info.stderr?.trim() ?? "command failed");
  delete process.env.DOCKER_HOST;
  process.env.DOCKER_CONTEXT = localDockerContext;
}

function runSupabase(args, options = {}) {
  return spawnSync("npx", [...supabaseCliArguments, ...args], {
    cwd: repositoryRoot,
    ...options,
  });
}

function requireSupabaseCli() {
  const result = runSupabase(["--version"], { encoding: "utf8", timeout: 30_000 });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr.trim() ?? "command failed";
    console.error(`local fixture preflight unavailable: Supabase CLI 2.108.0: ${detail}`);
    process.exit(result.status ?? 1);
  }
  if (result.stdout.trim() !== "2.108.0") {
    console.error(`local fixture preflight unavailable: expected Supabase CLI 2.108.0, received ${result.stdout.trim() || "no version"}`);
    process.exit(1);
  }
}

requireLocalDocker();
requireSupabaseCli();
if (process.argv.includes("--preflight")) {
  console.log("local fixture preflight passed: Docker daemon and Supabase CLI 2.108.0 are available");
  process.exit(0);
}

const result = runSupabase(
  ["db", "reset", "--local", "--no-seed", "--yes"],
  { stdio: "inherit", timeout: 300_000 },
);

if (result.error) {
  console.error(`local Supabase reset could not start: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const seedPath = path.join(repositoryRoot, "web/fixtures/supabase/seed.sql");
const seed = spawnSync(
  "docker",
  [
    "--context",
    localDockerContext,
    "exec",
    "-i",
    `supabase_db_${projectId}`,
    "psql",
    "--set",
    "ON_ERROR_STOP=on",
    "--username",
    "postgres",
    "--dbname",
    "postgres",
  ],
  {
    cwd: repositoryRoot,
    input: fs.readFileSync(seedPath),
    stdio: ["pipe", "inherit", "inherit"],
    timeout: 30_000,
  },
);
if (seed.error || seed.status !== 0) {
  console.error(`local Supabase fixture seed failed: ${seed.error?.message ?? "psql command failed"}`);
  process.exit(seed.status ?? 1);
}

const readLocalEnv = () => {
  const status = runSupabase(["status", "--output", "env"], {
    encoding: "utf8",
    timeout: 30_000,
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
    if (attempt === 0) continue;
    console.error(`local Supabase storage fixture upload failed for ${storagePath}: ${error.message}`);
    process.exit(1);
  }
  if (!uploaded) {
    console.error(`local Supabase storage fixture upload did not complete for ${storagePath}`);
    process.exit(1);
  }
}

console.log("local Supabase fixtures reset and uploaded: 2 users, 2 books, 2 images");
