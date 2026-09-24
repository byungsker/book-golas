import crypto from "node:crypto";
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
const supabaseCliArguments = ["--yes", "supabase@2.108.0"];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runSupabase(args) {
  return spawnSync("npx", [...supabaseCliArguments, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
}

function readLocalEnvironment() {
  const status = runSupabase(["status", "--output", "env"]);
  if (status.error || status.status !== 0) {
    fail(`fixture runtime status could not be read with Supabase CLI 2.108.0: ${status.error?.message ?? "status command failed"}`);
  }

  const localEnvironment = new Map();
  for (const line of status.stdout.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) localEnvironment.set(match[1], match[2].replace(/^"|"$/g, ""));
  }

  const apiUrl = localEnvironment.get("API_URL");
  const anonKey = localEnvironment.get("ANON_KEY");
  const jwtSecret = localEnvironment.get("JWT_SECRET");
  if (!apiUrl || !anonKey || !jwtSecret) {
    fail("fixture runtime status did not provide API_URL, ANON_KEY, and JWT_SECRET");
  }

  const parsedApiUrl = new URL(apiUrl);
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedApiUrl.hostname)) {
    fail("fixture runtime verification requires a loopback API URL");
  }

  return { apiUrl, anonKey, jwtSecret, endpoint: parsedApiUrl.origin };
}

function createFixtureJwt(user, jwtSecret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    aud: "authenticated",
    email: user.email,
    exp: 4_102_444_800,
    iat: 1_577_836_800,
    role: "authenticated",
    sub: user.id,
  });
  const signature = crypto.createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function createAuthenticatedClient(localEnvironment, user) {
  const token = createFixtureJwt(user, localEnvironment.jwtSecret);
  return createClient(localEnvironment.apiUrl, localEnvironment.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function verifyUserIsolation(cycle, localEnvironment, user, ownBook, foreignBook, ownImage, foreignImage) {
  const client = createAuthenticatedClient(localEnvironment, user);
  const { data: visibleBooks, error: booksError } = await client
    .from("books")
    .select("id,user_id,title")
    .order("id");
  if (booksError) fail(`fixture runtime books query failed for ${user.key}: ${booksError.message}`);
  if (visibleBooks?.length !== 1 || visibleBooks[0]?.id !== ownBook.id || visibleBooks[0]?.user_id !== user.id) {
    fail(`fixture runtime RLS returned an unexpected owner set for ${user.key}`);
  }

  const { data: foreignBooks, error: foreignBookError } = await client
    .from("books")
    .select("id,user_id,title")
    .eq("id", foreignBook.id);
  if (foreignBookError) fail(`fixture runtime foreign book query failed for ${user.key}: ${foreignBookError.message}`);
  if (foreignBooks?.length !== 0) fail(`fixture runtime leaked foreign book ${foreignBook.id} to ${user.key}`);

  const ownAsset = fs.readFileSync(path.resolve(repositoryRoot, ownImage.asset_path));
  const { data: ownDownload, error: ownDownloadError } = await client.storage
    .from("book-images")
    .download(ownImage.storage_path);
  if (ownDownloadError) fail(`fixture runtime owner storage download failed for ${user.key}: ${ownDownloadError.message}`);
  const ownBytes = Buffer.from(await ownDownload.arrayBuffer());
  if (!ownBytes.equals(ownAsset)) fail(`fixture runtime owner storage bytes differ for ${user.key}`);

  const { data: foreignDownload, error: foreignDownloadError } = await client.storage
    .from("book-images")
    .download(foreignImage.storage_path);
  if (!foreignDownloadError || foreignDownload) fail(`fixture runtime leaked foreign storage object to ${user.key}`);

  console.log(JSON.stringify({
    cycle,
    endpoint: localEnvironment.endpoint,
    authMode: "synthetic-local-jwt",
    user: user.key,
    subject: user.id,
    ownerBookIds: visibleBooks.map((book) => book.id),
    foreignBookId: foreignBook.id,
    foreignBookVisible: false,
    ownerStoragePath: ownImage.storage_path,
    ownerStorageBytes: ownBytes.length,
    foreignStoragePath: foreignImage.storage_path,
    foreignStorageVisible: false,
    rls: "enforced",
  }));
}

for (let cycle = 1; cycle <= 2; cycle += 1) {
  const reset = spawnSync(process.execPath, [resetScript], {
    cwd: repositoryRoot,
    stdio: "inherit",
    timeout: 360_000,
  });
  if (reset.error) fail(`fixture runtime reset could not start: ${reset.error.message}`);
  if (reset.status !== 0) process.exit(reset.status ?? 1);

  const localEnvironment = readLocalEnvironment();
  for (const [index, user] of manifest.users.entries()) {
    const foreignUser = manifest.users[(index + 1) % manifest.users.length];
    const ownBook = manifest.books.find((book) => book.user_key === user.key);
    const foreignBook = manifest.books.find((book) => book.user_key === foreignUser?.key);
    const ownImage = manifest.images.find((image) => image.user_key === user.key);
    const foreignImage = manifest.images.find((image) => image.user_key === foreignUser?.key);
    if (!foreignUser || !ownBook || !foreignBook || !ownImage || !foreignImage) {
      fail(`fixture runtime manifest ownership is incomplete for ${user.key}`);
    }
    await verifyUserIsolation(cycle, localEnvironment, user, ownBook, foreignBook, ownImage, foreignImage);
  }
}

console.log("fixture runtime contract passed: cycles=2 authenticated_users=2 owner_rows=2 foreign_rows=0 owner_objects=2 foreign_objects=0 no_data_leak=true");
