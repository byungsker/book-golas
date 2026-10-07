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
| AI/RAG | `supabase/functions/generate-embedding/index.ts`, `recall-search/index.ts`, `reading-insights/`, `recommend-next-books/`, `structure-notes/`, `supabase/functions/llm-evals/`, `docs/guides/ai-quality-evaluation-1.1.0.md`, `docs/guides/ai-cost-control-1.1.0.md` | BOK-427 fixes provider/model/prompt/schema contracts for eight calls and adds a privacy-safe deterministic synthetic gate. BOK-428 adds pricing history, preflight reservation, token provenance, quota/budget/hard-cap decisions, and control-event aggregation; BOK-429 remains the observability follow-on. |
| Push | `supabase/functions/send-fcm-push/`, `send-batch-nudge/`, `web/src/app/admin/push-logs/`, `docs/guides/push-operations-metrics-1.1.0.md` | BOK-420 records bounded delivery outcomes, failure categories, invalid-token cleanup, CTR, and persisted dedupe-hit evidence; outbound alerting remains an approval-gated candidate. |
| Admin/API | `web/src/app/admin/`, `web/src/app/api/admin/`, `web/src/proxy.ts` | Admin surface remains in source but is disabled; no repository administrator allowlist is configured, and hosted runtime/CORS verification remain outside this source contract. |
| Delivery | `docs/guides/edge-function-wrapper-1.1.0.md`, `supabase/migrations/` | Shared Edge Function HTTP boundaries, migration handling, rollback boundaries, and Deno tests are recorded; repository CI and live environment evidence are separate and not configured here. |
| Observability | `web/src/lib/error-reporting.ts`, `supabase/functions/_shared/edge-http.ts`, `docs/guides/error-observability-1.1.0.md` | BOK-421 establishes provider-neutral Web/Edge error capture, request correlation, masking, and sampling boundaries; Flutter provider activation and hosted sinks remain separately authorized. |

## 1.1.0 scope and active follow-ons

Historical foundation: BOK-414 quality gates, BOK-415 deployment and migration
boundary, BOK-416 authorization boundary, BOK-417 privacy-safe AI usage logging,
BOK-418 common function wrapper, BOK-419's bounded admin aggregate,
BOK-420's push delivery evidence, and BOK-421's verified Web/Edge error-capture
path with a cross-surface masking contract.

Active follow-ons: BOK-427 quality and regression evaluation, BOK-428 cost and
usage control, and BOK-429 privacy-safe operational observability. These remain
source and evidence work; provider changes, hosted sink verification, Flutter
activation, and external alert integration remain separately authorized work.

## Dependency and execution order

1. BOK-413 defines this scope and the independent PR boundaries.
2. BOK-414, BOK-415, and BOK-416 can proceed independently after BOK-413.
3. BOK-417 follows the runbook and migration boundary in BOK-415.
4. BOK-418 follows BOK-417; BOK-419 follows BOK-417; BOK-420 follows BOK-415.
5. BOK-421 follows BOK-418.
6. BOK-427 is the first active follow-on; BOK-428 follows BOK-427 for cost
   and usage control, and BOK-429 follows BOK-428 for privacy-safe
   operational observability.
7. BOK-427, BOK-428, and BOK-429 follow the quality and evidence baseline.

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
