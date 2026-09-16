# BOK-441 code review

Reviewed the final working tree based on `9525b774d830cc392341e58732cacdf46382035a` for issue #441.

## Result

APPROVE. No implementation blocker remains for the Recall acceptance criteria.

## Review points

- `web/src/lib/product/contracts/recall.ts` defines strict request, response, state, history, deletion and signed-image contracts. The API validates every response before returning it.
- `web/src/app/api/consumer/recall/route.ts` and its source route reject caller-selected identity fields, derive ownership from the verified session, keep global and book history scoped, and return private no-store responses.
- `web/src/lib/product/adapters/tables.ts` applies verified user and book filters, supports stable created-at/id range pagination, and makes history deletion idempotent. `getOwnedBookImageWithSignedUrl` verifies the owned book and image before generating the private signed URL.
- `web/src/components/consumer/recall-client.tsx` composes global and book-scoped surfaces with localized history, suggestions, answer cards, grouped sources, expand/collapse, copy feedback, record detail, photo signed-image loading and owned-book navigation. Consent, quota, provider, offline, unauthorized, empty and generic error states remain distinct.
- `recall-negative.json` and the fixture tests cover foreign data markers, caller identity rejection, typed provider/offline errors and signed-image boundaries. The existing library contract was updated to follow the extracted shared Recall component.
- The UI uses a native `<img>` for a short-lived private signed URL; lint reports this as one advisory Next image warning and no errors. The two other image warnings are pre-existing capture UI warnings.

## Validation

- `npm run test:recall` — PASS, 5 files and 23 tests.
- `npm run test:recall:negative` — PASS, 8 fixtures.
- `npx playwright test tests/e2e/recall.spec.ts --project=chromium --grep "global|book|source|history"` — PASS, 3 tests.
- `npx playwright test tests/e2e/recall.spec.ts --project=chromium --grep "consent|quota|foreign|empty"` — PASS, 1 test.
- `npx playwright test tests/e2e/library.spec.ts --project=chromium` — PASS, 5 tests.
- `npm test` — PASS, 61 files and 341 tests plus parity/BLDS/UI/progress/timer/notes contracts.
- `npm run typecheck` — PASS.
- `npm run lint -- --no-cache` — PASS, 0 errors and 3 advisory image warnings.
- `npm run build` — PASS; `/api/consumer/recall` and `/api/consumer/recall/source` are dynamic routes.

## Known blocker

The issue's referenced `.omo/plans/bookgolas-web-app-parity.md` is absent from the clean checkout. This is recorded in the CLEANUP receipt and retained as the plan footer in the contract and PR body; it does not block the verified #441 implementation.
