# CI Quality Gates — 1.1.0

## Purpose and delivery boundary

The `operations` delivery unit uses `.github/workflows/quality.yml` as its
minimum repository quality contract. It runs on pull requests targeting
`main`/`dev` and on approved delivery branch pushes. The workflow validates
source; it does not deploy, rotate secrets, change provider configuration, or
approve a release.

## Repository-local harness boundary

The former `docs/agent-harness/` contract is retired. OMX is the current
orchestration entrypoint for long-running work; verify the host installation
with `command -v omx` and `omx version`. This repository does not claim that
OMX enforces every control that the former local harness provided.

| Concern | Current authority | Status |
| --- | --- | --- |
| Orchestration and resume | OMX runtime and its active global operating contract | Host capability; not a repository CI gate. |
| Branch, base, version, and PR metadata | `AGENTS.md`, `.byungskerlab/branch-policy.json`, `.byungskerlab/release-lines.json`, and the target-version workflow | Fail-closed repository delivery check. |
| Source quality and exact function-head checks | `.github/workflows/quality.yml` | Required CI checks. |
| Provider, production, merge, release, and external-send authority | `AGENTS.md` and explicit owner approval | Never inferred from local tests or OMX state. |
| Former command and payload validation | None | Intentionally retired; no equivalent enforcement is claimed. |
| Former allowlisted roots and scoped `apply_patch` writes | Host tool permissions and `AGENTS.md` guidance | Repository-local enforcement is retired; no CI gate is claimed. |
| Former path and symlink escape checks | None | Intentionally retired; no equivalent enforcement is claimed. |
| Former exact repository HEAD/ancestry checks | Edge Function CI exact-source-head step; target-version workflow for delivery metadata | Coverage is limited to those applicable checks; no universal local-harness gate is claimed. |
| Former dirty-path, diff-scope, secret-diff, and secret/read-exclusion checks | None | Intentionally retired; no equivalent enforcement is claimed. |
| Former event catalog, append-only state/event, and status-schema checks | None | Intentionally retired; no equivalent enforcement is claimed. |
| Former disabled-capability, approval-binding, retry/attempt, provider/spend, and command-timeout guards | Explicit owner approval for external authority; otherwise none | The safety controls are not provided by OMX or repository CI. |

After an interruption, inspect the current dirty paths and exact commit, read
the active repository policy, and rerun the target-version and quality gates
before delivery. Do not replay or infer success for an external effect without
fresh evidence. Local Supabase work remains development-only.

## Gate matrix

| Job | Scope | Commands | Failure rule |
| --- | --- | --- | --- |
| Flutter Analyze and Test | All configured pull requests and delivery pushes | `flutter pub get`, `flutter gen-l10n`, `flutter analyze --no-fatal-infos`, `flutter test --no-pub` | Analyze errors or any test failure fails the job; info-level findings remain baseline evidence. |
| Web Audit, Lint, and Build | `/web/` and `/operations/` delivery branches | `npm ci`, `npm run lint`, `npm run build`; `npm audit --audit-level=high` runs on `/web/` only | Dependency audit, lint, or production build failure blocks the applicable gate. Other delivery units record `not applicable` by policy. |
| Edge Function Type Check | All applicable quality runs | One `edge-functions` job runs `deno check` for every function entrypoint, then the function and deterministic LLM test suite listed below | Any type-check or test failure fails the job. |
| Target Version Contract | All pull requests | `.github/workflows/target-version-gate.yml` checks branch, base, version, changed paths, and PR metadata from the trusted default-branch policy | Any contract failure blocks the pull request. This is a required check context. |
| Governance Contract Tests | Branches containing `/governance/` | Target-version contract tests when `.github/scripts/test_validate_target_version_pr.py` exists | Conditional job; a missing test file is explicitly non-blocking and reported as not present. The separate `Target Version Contract` remains the required fail-closed check. |

The Web scope is intentionally delivery-unit aware: `/web/` branches run the
dependency audit, while `/operations/` branches run install, lint, and build
because the operations surface includes Web administration paths. Other
delivery units receive a stable `not applicable` check context.

The required `Edge Function Type Check` context (the workflow job ID is
`edge-functions`) also runs authorization contracts, reminder tests, Reading
Insights tests, embedding usage-log tests, AI usage and cost contracts,
profile-collector tests, shared HTTP tests, delivery-metrics tests, and the
deterministic LLM evaluator plus its synthetic candidate run. These are steps
within that one job.

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
