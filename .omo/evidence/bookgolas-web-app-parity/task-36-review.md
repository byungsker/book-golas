# Task 36 manual review

The changed source was reviewed against issue #448 and the branch policy before
commit.

- Scope is limited to release configuration, release documentation, root and
  localized legal metadata/routes, shipped Web copy, the build/test gate and
  route evidence.
- The build gate runs before Next compilation and the missing-required-env
  fixture fails before any build command.
- Required public and server-only environment variables are separated. The
  service-role key and provider credentials are never exposed through a
  NEXT_PUBLIC variable.
- Admin access remains deny-by-default in proxy, server and API route guards.
- Root legal paths resolve to the Korean localized route while English and Korean
  localized routes render their own metadata and copy.
- Web billing remains disabled. Native push, camera/OCR, share sheet, iOS
  widgets, Siri/App Shortcuts and RevenueCat subscriptions are recorded as
  native-only boundaries. Web offline parity is not claimed.
- The runbook restricts hosted Edge verification to disposable Preview and
  prohibits Production deployment for this task.
- git diff --check, the release script, lint, unit/contract tests, build and
  focused route tests passed.

Open verification limits are operational: local Supabase migration checks could
not start because the remote Docker Desktop backend exits under the SSH session,
and full cross-browser E2E retains pre-existing BLDS/clipboard/focus failures
outside this change set.

Plan: .omo/plans/bookgolas-web-app-parity.md
