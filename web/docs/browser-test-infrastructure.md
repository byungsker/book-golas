# Browser test and local fixture infrastructure

This Web task owns the browser project matrix, deterministic local Supabase fixture contract, disposable-account helper and evidence path checks. The fixture data is local-only and uses reserved `.invalid` addresses, fixed UUIDs and a synthetic PNG asset.

## Commands

Run these from `web/`:

```bash
npm run test:e2e -- --list
npm run test:fixtures
npm run test:fixtures:runtime
npm run test:evidence-paths
```

The E2E project list contains Chromium, Firefox and WebKit. Browser binaries are installed by the developer or CI environment; `--list` only resolves the project matrix and does not require a running application.

E2E runs build the Web app and serve the production output on a loopback port. This keeps browser results independent from development-server compilation and stale processes.

To reset a local Supabase database, start Supabase from the repository root and run:

```bash
cd web
npm run reset:fixtures
```

The reset command is fail-closed to the local Supabase CLI and applies `web/fixtures/supabase/seed.sql` with `supabase db reset --local --sql-paths`. It does not accept a linked or remote project. The SQL creates two isolated auth users, two owned books, two owned image records and the local `book-images` bucket; the reset script uploads the synthetic PNG to both fixture storage paths.

`npm run test:fixtures:runtime` runs the reset and verifies both uploaded objects through the local Storage API, including their bytes. It requires the same local Supabase and Docker prerequisites as the reset command.

Disposable account helpers require `BOOKGOLAS_TEST_SUPABASE_URL` and `BOOKGOLAS_TEST_SUPABASE_SERVICE_ROLE_KEY` from the environment. The helper rejects non-local hosts and generates a fresh `.invalid` email and random password for each account. Secrets are never stored in fixtures or committed files.

## Evidence contract

`npm run test:evidence-paths` verifies the task record under `.omo/evidence/bookgolas-web-app-parity/` and the visual capture manifest under `web/docs/evidence/bookgolas-web-app-parity/`. Browser captures may be written to the visual directory by Playwright; `test-results/` remains ignored and disposable.

RED: the three requested commands were absent or incomplete before this task.

GREEN: the commands resolve the three browser projects and validate the deterministic fixture/evidence contracts without credentials.

SURFACE: run the Chromium E2E project with `npm run test:e2e -- --project=chromium`; use Firefox and WebKit in CI or after installing their browser binaries.

CLEANUP: local reset data, disposable accounts and `test-results/` are disposable; no local secret, token or account is committed.
