# Manual review — issue #440 / task 27

Status: APPROVE

- `ReadingAnalyticsRequestSchema` rejects incomplete, non-Monday weekly and unordered/future custom ranges.
- Server queries scope every source by the authenticated `user_id`; books are filtered by `deleted_at IS NULL` before event aggregation.
- Progress chart pages and heatmap page deltas use separate functions matching the native service semantics. Session seconds come from `reading_sessions.duration_seconds`.
- Goal writes validate the request and re-check `user_id` and `year` on update. The browser refreshes the stats route after a successful save.
- Share output has Web Share API, clipboard and download fallback paths, with a visible result state.
- Korean and English copy, loading/empty/error/unauthorized/consent/quota/offline/stale/invalid-range fixtures and browser evidence are present.
- The clean integration checkout does not contain `.omo/plans/bookgolas-web-app-parity.md`; the required reference remains in the contract, evidence and PR footer.
