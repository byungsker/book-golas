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

const fixtureRows = [
  ["00000000-0000-4000-8000-000000002011", "abandoned", "will_retry"],
  ["00000000-0000-4000-8000-000000002012", "paused", "will_retry"],
  ["00000000-0000-4000-8000-000000002013", "dropped", "will_retry"],
  ["00000000-0000-4000-8000-000000002014", "on_hold", "will_retry"],
  ["00000000-0000-4000-8000-000000002015", "finished", "completed"],
  ["00000000-0000-4000-8000-000000002016", "complete", "completed"],
  ["00000000-0000-4000-8000-000000002017", "done", "completed"],
  ["00000000-0000-4000-8000-000000002018", "not_started", "planned"],
  ["00000000-0000-4000-8000-000000002019", "queued", "planned"],
  ["00000000-0000-4000-8000-000000002020", "in_progress", "reading"],
  ["00000000-0000-4000-8000-000000002021", "active", "reading"],
];
const fixtureIds = fixtureRows.map(([id]) => `'${id}'`).join(", ");

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

const runSql = (container, sql) =>
  runDocker(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-q",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    sql,
  );

const values = fixtureRows
  .map(
    ([id, status]) =>
      `('${id}', 'Status migration fixture', '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z', 0, 100, '00000000-0000-4000-8000-000000001001', '${status}', NULL)`,
  )
  .join(",\n  ");
const migration = fs.readFileSync(
  path.join(
    repositoryRoot,
    "supabase/migrations/20260909163608_harden_ownership_and_progress_contract.sql",
  ),
  "utf8",
);

const sql = `
BEGIN;
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_status_check;
INSERT INTO public.books (
  id, title, start_date, target_date, current_page, total_pages, user_id, status, deleted_at
) VALUES
  ${values};
${migration}
SELECT json_agg(json_build_object('id', id, 'status', status) ORDER BY id)
FROM public.books
WHERE id IN (${fixtureIds});
ROLLBACK;
`;
const unknownSql = `
BEGIN;
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_status_check;
INSERT INTO public.books (
  id, title, start_date, target_date, current_page, total_pages, user_id, status, deleted_at
) VALUES (
  '00000000-0000-4000-8000-000000002022', 'Unknown status fixture',
  '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z', 0, 100,
  '00000000-0000-4000-8000-000000001001', 'mystery', NULL
);
${migration}
ROLLBACK;
`;

let container;
try {
  container = findDatabaseContainer();
  const result = runSql(container, sql);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "status migration failed");
  }
  const rows = JSON.parse(result.stdout.trim());
  const expected = fixtureRows.map(([id, , status]) => ({ id, status }));
  if (JSON.stringify(rows) !== JSON.stringify(expected)) {
    throw new Error(`legacy status mapping mismatch: ${JSON.stringify(rows)}`);
  }
  const unknown = runSql(container, unknownSql);
  if (
    unknown.status === 0 ||
    !unknown.stderr.includes("unsupported legacy book statuses: mystery")
  ) {
    throw new Error("unknown legacy status was not rejected with the typed migration error");
  }
  console.log("status migration contract passed: all legacy aliases and unknown-value guard");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
