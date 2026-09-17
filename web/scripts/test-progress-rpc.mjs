import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const projectConfig = fs.readFileSync(
  path.join(repositoryRoot, "supabase/config.toml"),
  "utf8",
);
const projectId = projectConfig.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
if (!projectId) throw new Error("local Supabase project id is missing");

const userA = "00000000-0000-4000-8000-000000001001";
const userB = "00000000-0000-4000-8000-000000001002";
const bookA = "00000000-0000-4000-8000-000000002001";
const keyFirst = "00000000-0000-4000-8000-000000005001";
const keyBackward = "00000000-0000-4000-8000-000000005002";
const keyComplete = "00000000-0000-4000-8000-000000005003";
const historyA = "00000000-0000-4000-8000-000000004001";
const historyB = "00000000-0000-4000-8000-000000004002";
const crossHistory = "00000000-0000-4000-8000-000000004003";

const runDocker = (args, input) =>
  spawnSync("docker", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    input,
  });

const findDatabaseContainer = () => {
  const result = runDocker([
    "ps",
    "--filter",
    `label=com.supabase.cli.project=${projectId}`,
    "--format",
    "{{.Names}}",
  ]);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "could not inspect Supabase containers");
  }
  const container = result.stdout
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value.startsWith("supabase_db_"));
  if (!container) throw new Error(`database container not found for ${projectId}`);
  return container;
};

const runSql = (container, sql, quiet = false) => {
  const args = [
    "exec",
    "-i",
    container,
    "psql",
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    "postgres",
    "-d",
    "postgres",
  ];
  if (quiet) args.push("-At", "-q");
  return runDocker(args, sql);
};

const setupSql = `
DELETE FROM public.reading_progress_history
WHERE id IN ('${historyA}', '${historyB}', '${crossHistory}');
DELETE FROM public.books WHERE id = '${bookA}';
INSERT INTO public.books (
  id, title, start_date, target_date, current_page, total_pages, user_id, status, deleted_at
) VALUES (
  '${bookA}', 'Progress fixture', '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z', 10, 100, '${userA}', 'reading', NULL
);
`;

const cleanupSql = `
DO $$
BEGIN
  IF to_regclass('public.reading_progress_requests') IS NOT NULL THEN
    DELETE FROM public.reading_progress_requests WHERE book_id = '${bookA}';
  END IF;
END;
$$;
DELETE FROM public.reading_progress_history
WHERE id IN ('${historyA}', '${historyB}', '${crossHistory}')
   OR book_id = '${bookA}';
DELETE FROM public.books WHERE id = '${bookA}';
`;

const callRpc = (container, currentPage, expectedPage, key, userId = userA, readingTime = 120) =>
  runSql(
    container,
    `\\set VERBOSITY verbose
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '${userId}';
SELECT row_to_json(result)
FROM public.update_reading_progress(
  '${bookA}', ${currentPage}, ${expectedPage}, '${key}', ${readingTime}
) AS result;
COMMIT;
`,
    true,
  );

const parseRow = (result) => {
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "progress RPC failed");
  }
  const line = result.stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!line) throw new Error("progress RPC returned no row");
  return JSON.parse(line);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

let container;
let exitCode = 0;
try {
  container = findDatabaseContainer();
  const setup = runSql(container, setupSql);
  if (setup.status !== 0) throw new Error(setup.stderr.trim() || "fixture setup failed");

  const first = parseRow(callRpc(container, 12, 10, keyFirst));
  assert(first.previous_page === 10, "first write previous_page mismatch");
  assert(first.current_page === 12, "first write current_page mismatch");
  assert(first.status === "reading", "first write status mismatch");
  assert(first.history_recorded === true, "first write should record positive history");

  const duplicate = parseRow(callRpc(container, 12, 10, keyFirst));
  assert(duplicate.history_id === first.history_id, "duplicate key created a different history event");
  assert(duplicate.updated_at === first.updated_at, "duplicate key changed the stored result");

  const idempotencyConflict = callRpc(container, 13, 10, keyFirst);
  assert(idempotencyConflict.status !== 0, "changed request reused the idempotency key");
  assert(
    idempotencyConflict.stderr.includes("idempotency_conflict"),
    "idempotency conflict message is not typed",
  );
  assert(
    idempotencyConflict.stderr.includes("P0001"),
    "idempotency conflict SQLSTATE is not P0001",
  );

  const stale = runSql(
    container,
    `\\set VERBOSITY verbose
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '${userA}';
SELECT * FROM public.update_reading_progress(
  '${bookA}', 15, 10, '00000000-0000-4000-8000-000000005004', 120
);
COMMIT;
`,
    true,
  );
  assert(stale.status !== 0, "stale expected page unexpectedly succeeded");
  assert(stale.stderr.includes("progress_conflict"), "stale conflict message is not typed");
  assert(stale.stderr.includes("P0001"), "stale conflict SQLSTATE is not P0001");

  const backward = parseRow(callRpc(container, 8, 12, keyBackward));
  assert(backward.history_recorded === false, "backward edit should not append positive history");
  const backwardDuplicate = parseRow(callRpc(container, 8, 12, keyBackward));
  assert(backwardDuplicate.history_id === null, "backward duplicate should remain history-free");

  const completed = parseRow(callRpc(container, 100, 8, keyComplete));
  assert(completed.status === "completed", "completion did not set canonical status");
  assert(completed.history_recorded === true, "completion should record positive history");

  const state = runSql(
    container,
    `SELECT row_to_json(result)
FROM (
  SELECT
    current_page,
    status,
    (SELECT count(*) FROM public.reading_progress_history WHERE book_id = '${bookA}') AS history_count
  FROM public.books
  WHERE id = '${bookA}'
) AS result;
`,
    true,
  );
  const stateRow = parseRow(state);
  assert(stateRow.current_page === 100, "final current_page mismatch");
  assert(stateRow.status === "completed", "final status mismatch");
  assert(Number(stateRow.history_count) === 2, "final positive history count mismatch");

  const crossOwner = runSql(
    container,
    `\\set VERBOSITY verbose
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '${userB}';
SELECT * FROM public.update_reading_progress(
  '${bookA}', 14, 100, '00000000-0000-4000-8000-000000005005', 120
);
COMMIT;
`,
    true,
  );
  assert(crossOwner.status !== 0, "cross-owner progress RPC unexpectedly succeeded");
  assert(crossOwner.stderr.includes("book_not_found"), "cross-owner RPC did not return typed not-found");
  assert(crossOwner.stderr.includes("P0002"), "cross-owner RPC SQLSTATE is not P0002");
  console.log("progress RPC contract passed: atomic write, stale conflict, idempotency replay/conflict, backward edit, completion, owner boundary");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  if (container) {
    const cleanup = runSql(container, cleanupSql);
    if (cleanup.status !== 0) {
      console.error(cleanup.stderr.trim() || "fixture cleanup failed");
      exitCode = 1;
    }
  }
}
process.exitCode = exitCode;
