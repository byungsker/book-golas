# AI Server Operations Readiness — 1.1.0

## Purpose and delivery boundary

This document is the execution index for the Bookgolas AI Server Operations
Readiness lane. The delivery unit is `operations`, the target is `1.1.0`, and
the profile is `backend-service` with `main` as the continuous promotion base.
It records source-grounded scope and sequencing; it does not authorize
production deployment, secret changes, external alerts, store release, or
public claims.

## Current asset map

| Surface | Evidence | Current boundary |
| --- | --- | --- |
| AI/RAG | `supabase/functions/generate-embedding/index.ts`, `recall-search/index.ts`, `reading-insights/`, `recommend-next-books/`, `structure-notes/`, `docs/guides/ai-usage-logging-1.1.0.md` | `generate-embedding` has the first privacy-safe cost, token, latency, and outcome contract; remaining AI functions and aggregate dashboard coverage are later work. |
| Push | `supabase/functions/send-fcm-push/`, `send-batch-nudge/`, `web/src/app/admin/push-logs/` | FCM delivery and admin views exist; operational success, failure, invalid-token, CTR, and dedupe evidence is incomplete. |
| Admin/API | `web/src/app/admin/`, `web/src/app/api/admin/`, `web/src/proxy.ts`, `docs/guides/admin-edge-function-authorization-1.1.0.md` | Admin surface exists; BOK-416 records route-level authorization evidence while hosted runtime and CORS-origin verification remain outside this source contract. |
| Delivery | `.github/workflows/quality.yml`, `docs/guides/ci-quality-gates-1.1.0.md`, `docs/guides/supabase-deployment-migration-rollback-1.1.0.md`, `docs/guides/edge-function-wrapper-1.1.0.md`, `.github/workflows/deploy-edge-functions.yml`, `supabase/migrations/` | CI quality scope, shared Edge Function HTTP boundary, deployment paths, migration handling, rollback boundaries, and Deno tests are recorded; live environment evidence remains separate. |

## 1.1.0 scope proposal

Must-have for readiness: BOK-414 CI gates, BOK-415 deploy/migration runbook,
BOK-416 authorization boundary, BOK-417 privacy-safe AI usage logging, and
BOK-418 common function wrapper. BOK-421 must establish at least one verified
error-capture path and the cross-surface masking contract.

Follow-up after the core safety/measurement baseline: BOK-419's full admin AI
usage dashboard, BOK-420's expanded push metrics and alert integration, and
additional surface coverage beyond the first verified BOK-421 path. These
remain roadmap work, not silently dropped scope.

## Dependency and execution order

1. BOK-413 defines this scope and the independent PR boundaries.
2. BOK-414, BOK-415, and BOK-416 can proceed independently after BOK-413.
3. BOK-417 follows the runbook and migration boundary in BOK-415.
4. BOK-418 follows BOK-417; BOK-419 follows BOK-417; BOK-420 follows BOK-415.
5. BOK-421 follows BOK-418.

Each child issue remains one reviewed PR under `operations/1.1.0`; no child
issue inherits another issue's approval, deployment, or external-action gate.

## Release coexistence and claims

The P0 1.0.2 patch, Android readiness, and Google Play gates remain ahead of
this lane. Documentation, CI, and low-risk observability preparation may run in
parallel. Auth, migrations, function behavior, admin authorization, external
alerts, and production deployment require their own evidence and authority.

Until those gates pass, do not claim production-ready AI infrastructure,
secure admin APIs, proven rollback, measured AI cost/quality, zero-downtime
operation, or deployed/released status. Resume/interview claims must name the
exact verified surface, command or runtime evidence, and its limits.

## Acceptance evidence

- The child issue map and dependency order above match canonical issue metadata.
- Each child has a separate acceptance matrix, reviewer, rollback boundary, and
  target delivery metadata.
- Roadmap progress remains computed from canonical `Done` issues, not checklist
  completion.
