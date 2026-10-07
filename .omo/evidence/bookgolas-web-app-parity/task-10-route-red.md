# Task 10 route RED baseline

Date: 2026-09-15 (Asia/Seoul)
Base: `ea3a72138181c737bbd1f69ace90e5a44d43728e`
Branch: `codex/feature/web/1.1.0/BOK-422-consumer-routing`

## Consumer route contract

Scenario: the required consumer route contract command is absent before implementation.

Invocation: `cd web && npm run test:consumer-routes`

Binary observable: exit code `1`.

Captured output:

```text
npm error Missing script: "test:consumer-routes"
npm error
npm error Did you mean this?
npm error   npm run test:consumer # run the "test:consumer" package script
```

## Unauthorized route surface

Scenario: the prescribed unauthorized Playwright route suite is unavailable before implementation.

Invocation: `cd web && npx playwright test tests/e2e/routes.spec.ts --project=chromium --grep unauthorized`

Binary observable: exit code `1`.

Captured output:

```text
error: unknown command 'test'
```

Plan: .omo/plans/bookgolas-web-app-parity.md
