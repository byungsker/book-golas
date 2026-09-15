# Task 14 diff review

- Scope: GitHub issue #425 only. The change mounts an authenticated consumer shell around the five native product tabs, adds responsive desktop and mobile navigation, URL-owned Home and Reading Chart re-tap state, the global Book search/Recall chooser, a floating timer integration slot, and route pending/error boundaries.
- Native alignment: the shell follows the Flutter `MainScreen` five-page order, native Home and Reading Chart cycles, bottom-bar compact labels, global search modes, and timer placement. Admin, marketing, legal, onboarding, and pushed detail routes stay outside the shell.
- Route safety: existing localized auth gating remains in the consumer layout. The added loopback-only fixtures cover expired sessions, unauthorized private data, pending, and unavailable states without changing production behavior when test mode is disabled.
- State recovery: invalid Home or Reading Chart query values fall back to native defaults; valid values survive refresh and deep links. Re-tapping other tabs retains their normal route behavior.
- Accessibility and localization: desktop links expose `aria-current`, the mobile bar retains button semantics, the search chooser is a named modal dialog, focus rings remain visible, and Korean/English labels cover all shell actions and states.
- Regression review: the issue-specific contract, Vitest suite, Chromium desktop/mobile suite, expired-session suite, TypeScript, ESLint, full Vitest/parity/BLDS/UI contract suite, and production build were run. The full regression is recorded after the feature commit because the parity negative harness intentionally binds evidence to a clean Git revision.
- Boundary review: no native-only capability was added, no subscription or admin navigation was coupled, and the protected `/private/tmp/bookgolas-web-blds-453` worktree was left untouched.

Verdict: APPROVE

Plan: .omo/plans/bookgolas-web-app-parity.md
