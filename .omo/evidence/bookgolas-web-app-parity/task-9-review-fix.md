# BOK-421 review fix evidence

## RED: failing-first baseline

Scenario: inspect the clean `HEAD` implementation before the review fix.

Invocation: from `web/`, run a TypeScript AST assertion over `git show HEAD:web/src/components/consumer/ui-primitives-showcase.tsx` and `git show HEAD:web/tests/e2e/ui-primitives.spec.ts`. The assertion locates all four `BoundaryState` JSX elements, checks each for an `onAction` or `href` attribute, and walks the `keyboard activation and focus contract` test for an actual `getByTestId("error-state").getByRole(...).click()` call.

Captured RED result (exit code 1):

```text
RED baseline AST assertion failed (2):
- BoundaryState controls without handler/destination: 4

4 !== 0

- keyboard activation scenario must click the error-state retry control

false !== true
```

This is a failing structural assertion: the baseline has four action controls without a handler or destination, and the existing Chromium keyboard scenario has no retry click.

## GREEN: focused verification

The implementation wires all four boundary buttons to state-specific React outcomes and the browser scenario clicks retry before dismissing the snackbar.

```text
npm run test:ui-primitives                 PASS
npm run test:ui-primitives:negative       PASS
npm run typecheck                          PASS
npm run test:ui-primitives:browser        PASS — 9 passed (22.5s)
```

The Chromium scenario ran against `/en/ui-primitives` and observed:

- `Try again` → `Retry requested. (1)`
- `Go to sign in` → `Go to sign in · Sign in to view your library.`
- `Open consent settings` → `Open consent settings · Choose consent before using AI and notification features.`
- `View usage` → `View usage · You can use this feature again in the next period.`
- `Reconnect` → `Reconnect · Reconnect before trying to save again.`

## SURFACE: real browser artifact

`task-9-ui-primitives-en-action-feedback.png` is the Chromium full-page capture taken after retry and every boundary action. The action log and localized outcome assertions are recorded in `task-9-bookgolas-web-app-parity.json`.

## CLEANUP

The Playwright web server exited with the test command. Verification after the run found port 3000 free, no `next-server`, Playwright, or UI-test process, no `bkgqa-web` tmux session, and the stale worker launcher PID 61286 stopped. Cleanup receipt: `port 3000 free; no Playwright/next-server/UI-test process; tmux bkgqa-web absent; killed stale worker launcher 61286`.
