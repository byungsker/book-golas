# Agent Job and Capability Catalog

## Repeated agent job

An AI coding agent, personal reading assistant, or orchestrator needs to
inspect one user's Bookgolas reading state without reproducing Supabase
queries, handling authentication details, or scraping app internals. The
smallest useful operation is a bounded JSON read of the user's library or
progress, followed by stored Recall or reading-insight retrieval.

Call this surface when the task needs current, authenticated Bookgolas data in
a headless workflow. Do not call it for writes, bulk export, anonymous search,
subscription changes, or AI generation; those capabilities are intentionally
outside 0.1.0.

## Stable capabilities

| ID | API route | CLI command | Side effect | Units |
| --- | --- | --- | --- | ---: |
| `books.search` | `GET /v1/books/search?q=` | `books search --query` | none | 1 |
| `library.list` | `GET /v1/library` | `library` | none | 1 |
| `reading_progress.list` | `GET /v1/reading-progress` | `progress` | none | 1 |
| `recall.history` | `GET /v1/recall` | `recall` | none | 1 |
| `reading_insights.list` | `GET /v1/insights` | `insights` | none | 1 |
| `account.entitlement` | `GET /v1/entitlement` | `entitlement` | none | 1 |

Every list is explicitly paginated, capped at 100 rows per page, and returns
`has_more` plus a nullable total. Partial or unavailable provider results are
errors rather than fabricated empty or zero metrics.

## Discovery and invocation

`GET /v1/capabilities` is public metadata. All data routes require a Supabase
Bearer access token. The API returns versioned JSON with request ID, timestamp,
pagination, usage attribution, and a provider-cost flag. The CLI mirrors that
JSON on stdout and sends diagnostics to stderr.
