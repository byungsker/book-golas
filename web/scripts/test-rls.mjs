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
const bookB = "00000000-0000-4000-8000-000000002002";
const deletedBook = "00000000-0000-4000-8000-000000002003";
const imageA = "00000000-0000-4000-8000-000000003001";
const imageB = "00000000-0000-4000-8000-000000003002";
const crossImage = "00000000-0000-4000-8000-000000003003";
const historyA = "00000000-0000-4000-8000-000000004001";
const historyB = "00000000-0000-4000-8000-000000004002";
const crossHistory = "00000000-0000-4000-8000-000000004003";
const sessionA = "00000000-0000-4000-8000-000000006001";
const sessionB = "00000000-0000-4000-8000-000000006002";
const crossSession = "00000000-0000-4000-8000-000000006003";

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

const fixtureSql = `
BEGIN;
DELETE FROM public.reading_sessions
WHERE id IN ('${sessionA}', '${sessionB}', '${crossSession}');
DELETE FROM public.reading_progress_history
WHERE id IN ('${historyA}', '${historyB}', '${crossHistory}');
DELETE FROM public.book_images
WHERE id IN ('${imageA}', '${imageB}', '${crossImage}');
DELETE FROM public.books
WHERE id IN ('${bookA}', '${bookB}', '${deletedBook}');
DELETE FROM public.users
WHERE id IN ('${userA}', '${userB}');
DELETE FROM auth.users
WHERE id IN ('${userA}', '${userB}');
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('${userA}', 'authenticated', 'authenticated', 'rls-fixture-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('${userB}', 'authenticated', 'authenticated', 'rls-fixture-b@example.test', '', now(), '{}', '{}', now(), now());
INSERT INTO public.books (
  id, title, start_date, target_date, current_page, total_pages, user_id, status, deleted_at
) VALUES
  ('${bookA}', 'A active', '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z', 10, 100, '${userA}', 'reading', NULL),
  ('${bookB}', 'B active', '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z', 20, 100, '${userB}', 'reading', NULL),
  ('${deletedBook}', 'A deleted', '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z', 5, 100, '${userA}', 'reading', now());
INSERT INTO public.book_images (id, book_id, user_id, image_url, caption) VALUES
  ('${imageA}', '${bookA}', '${userA}', 'a.png', 'A'),
  ('${imageB}', '${bookB}', '${userB}', 'b.png', 'B'),
  ('${crossImage}', '${bookB}', '${userA}', 'cross.png', 'cross');
INSERT INTO public.reading_progress_history (id, user_id, book_id, page, previous_page) VALUES
  ('${historyA}', '${userA}', '${bookA}', 10, 0),
  ('${historyB}', '${userB}', '${bookB}', 20, 0),
  ('${crossHistory}', '${userA}', '${bookB}', 20, 0);
INSERT INTO public.reading_sessions (id, user_id, book_id, started_at, duration_seconds) VALUES
  ('${sessionA}', '${userA}', '${bookA}', '2026-01-01T00:00:00Z', 30),
  ('${sessionB}', '${userB}', '${bookB}', '2026-01-01T00:00:00Z', 30),
  ('${crossSession}', '${userA}', '${bookB}', '2026-01-01T00:00:00Z', 30);
COMMIT;
`;

const isolationSql = `
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '${userA}';
DO $$
DECLARE
  visible_count integer;
  changed_count integer;
BEGIN
  SELECT count(*) INTO visible_count
  FROM public.book_images
  WHERE book_id = '${bookA}';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'user-b-isolation: own book image visibility expected 1, got %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count
  FROM public.book_images
  WHERE book_id = '${bookB}';
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'user-b-isolation: cross-owner book image visibility expected 0, got %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count
  FROM public.reading_progress_history
  WHERE book_id = '${bookB}';
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'user-b-isolation: cross-owner history visibility expected 0, got %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count
  FROM public.reading_sessions
  WHERE book_id = '${bookB}';
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'user-b-isolation: cross-owner session visibility expected 0, got %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count
  FROM public.books
  WHERE id = '${deletedBook}';
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'deleted-at-filter: deleted book visibility expected 0, got %', visible_count;
  END IF;

  UPDATE public.book_images
  SET caption = 'tampered'
  WHERE id = '${crossImage}';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 0 THEN
    RAISE EXCEPTION 'user-b-isolation: cross-owner book image update changed % rows', changed_count;
  END IF;

  BEGIN
    DELETE FROM public.reading_progress_history
    WHERE id = '${crossHistory}';
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 0 THEN
      RAISE EXCEPTION 'user-b-isolation: cross-owner history delete changed % rows', changed_count;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  BEGIN
    INSERT INTO public.book_images (id, book_id, user_id, image_url)
    VALUES ('00000000-0000-4000-8000-000000003004', '${bookB}', '${userA}', 'forbidden.png');
    RAISE EXCEPTION 'user-b-isolation: cross-owner book image insert was accepted';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO public.reading_progress_history (user_id, book_id, page, previous_page)
    VALUES ('${userA}', '${bookB}', 21, 20);
    RAISE EXCEPTION 'user-b-isolation: cross-owner history insert was accepted';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      NULL;
  END;

  UPDATE public.reading_sessions
  SET ended_at = '2026-01-01T00:01:00Z'
  WHERE id = '${crossSession}';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 0 THEN
    RAISE EXCEPTION 'user-b-isolation: cross-owner session update changed % rows', changed_count;
  END IF;

  DELETE FROM public.reading_sessions
  WHERE id = '${crossSession}';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 0 THEN
    RAISE EXCEPTION 'user-b-isolation: cross-owner session delete changed % rows', changed_count;
  END IF;

  BEGIN
    INSERT INTO public.reading_sessions (user_id, book_id, started_at, duration_seconds)
    VALUES ('${userA}', '${bookB}', '2026-01-01T00:00:00Z', 30);
    RAISE EXCEPTION 'user-b-isolation: cross-owner session insert was accepted';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      NULL;
  END;
END;
$$;
ROLLBACK;
`;

const cleanupSql = `
DO $$
BEGIN
  IF to_regclass('public.reading_progress_requests') IS NOT NULL THEN
    DELETE FROM public.reading_progress_requests
    WHERE book_id IN ('${bookA}', '${bookB}', '${deletedBook}');
  END IF;
END;
$$;
DELETE FROM public.reading_sessions
WHERE id IN ('${sessionA}', '${sessionB}', '${crossSession}');
DELETE FROM public.reading_progress_history
WHERE id IN ('${historyA}', '${historyB}', '${crossHistory}');
DELETE FROM public.book_images
WHERE id IN ('${imageA}', '${imageB}', '${crossImage}');
DELETE FROM public.books
WHERE id IN ('${bookA}', '${bookB}', '${deletedBook}');
DELETE FROM auth.users
WHERE id IN ('${userA}', '${userB}');
DELETE FROM public.users
WHERE id IN ('${userA}', '${userB}');
`;

const privilegeSql = `
DO $$
DECLARE
  table_name text;
  role_name text;
  privilege_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'books',
    'book_images',
    'reading_progress_history',
    'reading_sessions'
  ] LOOP
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
        IF has_table_privilege(
          role_name,
          format('public.%s', table_name),
          privilege_name
        ) THEN
          RAISE EXCEPTION
            'table privilege contract: % has % on public.%',
            role_name,
            privilege_name,
            table_name;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;
`;

const grep = process.argv[2] === "--grep" ? process.argv[3] : undefined;
if (grep && grep !== "user-b-isolation") {
  throw new Error(`unsupported RLS scenario: ${grep}`);
}

let container;
let exitCode = 0;
try {
  container = findDatabaseContainer();
  const privileges = runSql(container, privilegeSql);
  if (privileges.status !== 0) {
    throw new Error(privileges.stderr.trim() || "table privilege contract failed");
  }
  const fixture = runSql(container, fixtureSql);
  if (fixture.status !== 0) throw new Error(fixture.stderr.trim() || "fixture setup failed");
  const result = runSql(container, isolationSql);
  if (result.status !== 0) {
    console.error(result.stderr.trim() || result.stdout.trim());
    exitCode = result.status ?? 1;
  } else {
    console.log("RLS contract passed: user-b-isolation, deleted-at-filter");
  }
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
