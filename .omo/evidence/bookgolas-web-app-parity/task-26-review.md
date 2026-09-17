# Task 26 manual review

Status: APPROVE

- The calendar reads `reading_progress_history` and `reading_sessions` only after resolving the authenticated server session.
- Book reads are constrained by the authenticated `user_id` and `deleted_at IS NULL`; event rows without an owned active book are discarded before aggregation.
- Progress timestamps use `created_at`, session timestamps use `started_at`, and both are assigned with the explicit `Asia/Seoul` display boundary.
- Completed, paused and planned values come from the current book row. `planned_start_date` is rendered as a planned marker, and no historical completion event is synthesized.
- The browser surface keeps the native all/reading/completed filters, month navigation, month picker, day detail panel and canonical book links. Native calendar widgets and push scheduling are documented as native-only.
- Consent, quota, offline, unauthorized, empty, error and ownership fixtures remain typed and covered by the negative verifier.

Validation reviewed: `npm run test:calendar`, `npm run test:calendar:negative`, `npm test`, `npm run typecheck`, `npm run lint -- --no-cache`, `npm run build`, the two issue-specified Chromium commands, and the full calendar Chromium suite.

Plan footer: `Plan: .omo/plans/bookgolas-web-app-parity.md`
