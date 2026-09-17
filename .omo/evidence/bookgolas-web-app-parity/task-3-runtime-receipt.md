# BOK-413 runtime receipt

- Implementation commit range: `a8b98574bde83c10770f637b342dc452e740fd35` through `4c6a2ef810858c00fcd3366eccb69fa4ad17a7c2`.
- Runtime: isolated Supabase project `book-golas-413-review` on remote Docker host `byungsker-docker`.
- Review worktree: `/private/tmp/bookgolas-review-413`.

## Runtime preparation

- Recreated only the `book-golas-413-review` database container with isolated ports `56421–56427`; unrelated projects were left running.
- Restored the standard isolated runtime `auth.jwt()` helper and applied all 36 repository migrations in filename order with `docker exec ... psql`.
- Added the existing runtime compatibility column `auth.users.email_confirmed_at` in the isolated database only so the repository fixture matches the prepared Supabase auth schema.
- `npm ci --prefix web --ignore-scripts`: exit 0.

## Commands and observed results

- `npm --prefix web run test:status-migration`: exit 0; all documented legacy aliases mapped and unknown `mystery` status rejected with the typed migration error.
- `npm --prefix web run test:rls`: exit 0; owner isolation, deleted-at filtering, reading-session parent ownership, and `TRUNCATE/REFERENCES/TRIGGER` privilege negatives passed.
- `npm --prefix web run test:rls -- --grep user-b-isolation`: exit 0.
- `npm --prefix web run test:progress-rpc`: exit 0; atomic write, stale conflict, idempotency replay/conflict, backward edit, completion, and owner boundary passed.
- `npm --prefix web run typecheck`: exit 0.
- `npm --prefix web run lint`: exit 0.
- `npm --prefix web test`: exit 0; 8 Vitest files and 71 tests, including the action-level RPC integration assertions, parity matrix, 59 parity negative fixtures, BLDS React parity, BLDS negative, and SSR state contracts passed.
- `task-3-bookgolas-web-app-parity.sql` via `psql -v ON_ERROR_STOP=1`: exit 0; RED, GREEN, SURFACE, and CLEANUP phases observed. Cleanup counts were books=0, progress=0, requests=0. Table privilege surface was false for anon/authenticated `TRUNCATE`, `REFERENCES`, and `TRIGGER`.
- Security surface query: RPC `search_path=pg_catalog, pg_temp`; authenticated schema CREATE=false; history UPDATE=false/DELETE=false; books TRUNCATE/REFERENCES/TRIGGER=false for anon/authenticated.

## SHA-256 of implementation files

- `a759ad0d0474f7ca385913c5246e93a0499c335dca4d624d05a610b11c91c2c7`  .omo/evidence/bookgolas-web-app-parity/task-3-bookgolas-web-app-parity.sql
- `0f0893dbef8d91cec43e851ef62840e203a33c80a4311ad6b4e2a50501562fbb`  docs/guides/reading-progress-contract.md
- `75ecb4a762177b07443342dffffd839cd83b8f1958f8bbcd65008d489c0e7d37`  supabase/migrations/20260909163608_harden_ownership_and_progress_contract.sql
- `be4da1a0187941b4dda5d60b595165af31e2f041180825de023337ca7472c1cc`  web/package.json
- `f91d1e2bc350c94cd4f5e54c065f8199aa778f7917ed068e3b45d93e81536125`  web/scripts/test-progress-rpc.mjs
- `dbb5cb94d51b64cfa9d991bd15225150ca314657586a6ea99ff1f7610772b360`  web/scripts/test-rls.mjs
- `796d19cec06873dcfa14a849388f4f1e0a05816e3b3618f51859100184c79627`  web/scripts/test-status-migration.mjs
- `7a32d256ff697280dc33f99f19407a5255c8f2967639f1a2dcf0747461601405`  web/src/app/actions/reading-progress.ts
- `618c69c01e1e8b031cbe5092ee361765f6e9beec06ee932fae7f5c3a2ccf45e7`  web/src/app/actions/reading-progress.test.ts
- `243b41003bb0b532d26038352bf9f76dd4eadf3eb1cbb42406e9cf336a8f4502`  web/src/components/consumer/progress-updater.tsx
