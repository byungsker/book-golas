# CI Quality Gates — 1.1.0

## Purpose and delivery boundary

The `operations` delivery unit uses `.github/workflows/quality.yml` as its
minimum repository quality contract. It runs on pull requests targeting
`main`/`dev` and on approved delivery branch pushes. The workflow validates
source; it does not deploy, rotate secrets, change provider configuration, or
approve a release.

## Gate matrix

| Job | Scope | Commands | Failure rule |
| --- | --- | --- | --- |
| Flutter Analyze and Test | App PRs and delivery pushes | `flutter pub get`, `flutter gen-l10n`, `flutter analyze --no-fatal-infos`, `flutter test --no-pub` | Analyze errors or any test failure fails the job; info-level findings remain baseline evidence. |
| Web Audit, Lint, and Build | Web delivery branches containing `/web/` | `npm ci`, `npm audit --audit-level=high`, `npm run lint`, `npm run build` | Dependency audit, lint, or production build failure blocks the Web gate. Non-Web delivery units record `not applicable` by policy. |
| Edge Function Type Check | All applicable quality runs | `deno check` for every function entrypoint | Any type-check failure fails the job. |
| Edge Function Unit Tests | All applicable quality runs | Authorization contract, Reading Insights, and daily/deadline reminder tests | Any Deno test failure fails the job. |

The Web scope is intentionally delivery-unit aware: governance history
restricts execution of `npm` commands to the Web release train rather than
running Web code from unrelated mobile or operations branches. The job still
reports a stable check context for those branches.

## Current baseline

On 2026-08-22, local verification on `main` produced:

- Flutter analyze and full test suite: pass; existing informational lints are
  non-fatal under the approved command.
- Web lint and production build: pass.
- Web `npm audit --audit-level=high`: fail for transitive `nanoid <3.3.18`
  (High). The remediation is isolated in BOK-423 on the Web release line and
  is not silently weakened or changed by the operations gate.
- Deno function tests: pass — 5 authorization-contract tests, 20 Reading
  Insights BDD assertions, and 9 reminder tests.

## PR evidence

For a PR, record the exact head SHA, target delivery metadata, and the final
status of each required job. A green required check proves the command ran on
that head; it does not prove hosted deployment, production credentials,
external provider health, or store release readiness.

Recommended local reproduction:

```bash
cd app && flutter pub get && flutter gen-l10n
cd app && flutter analyze --no-fatal-infos && flutter test --no-pub
cd web && npm ci && npm run lint && npm run build
deno test --allow-read --allow-net supabase/functions/authorization-contract.test.ts
deno test --allow-net supabase/functions/send-batch-nudge/daily-reminder_test.ts supabase/functions/send-batch-nudge/deadline-reminder_test.ts
deno test --config supabase/functions/reading-insights/deno.json --allow-env --allow-net supabase/functions/reading-insights/test.ts
```
