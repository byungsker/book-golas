# Issue #421 final fresh gate review

- recommendation: APPROVE
- verdict: PASS
- confidence: HIGH
- goalId: `bookgolas-web-app-parity`

## Original intent

Deliver a real, reusable, token-driven BLDS consumer primitive showcase that follows the documented Flutter/native hierarchy and behavior, supports Korean and English, renders loading/empty/error/retry/unauthorized/consent/quota/offline states, responds at 390x844 and 1440x900 in light and dark themes, supports keyboard/focus/reduced-motion behavior, and names native-only boundaries.

## Desired outcome

The live `/{locale}/ui-primitives` surface should visibly compose public BLDS adapters with complete localized copy and state/navigation regions. Each supplied full-page PNG should be a valid, completely composited 390px or 1440px-wide capture with legible CJK wrapping, coherent glass hierarchy, and no clipping or overflow.

## User outcome review

PASS. Direct inspection of all nine fresh PNGs and their source confirms the requested outcome. The eight locale/viewport/theme captures contain every required region and state; the ninth overview is an exact duplicate of the Korean mobile dark capture. Mobile uses a readable single-column stack, desktop uses the documented two-column plus wide-section layout, and both themes preserve BLDS surface depth, spacing, typography, action/selection accents, and legible contrast.

Every Korean capture was checked at the intro, buttons, cards, fields, loading/empty/error stack, retry/snackbar, tabs/segments/bottom navigation, pressable region, four boundary cards, and native-only footnote. No orphaned particles/endings, detached labels, clipped glyphs, tofu, or unnatural semantic splits are visible. The repaired desktop quota title wraps as `이번 달 AI 사용량을 모두` / `사용했습니다`; mobile keeps it on one line. The localized heading is exactly `누르기 피드백`.

The apparent missing button text in scaled whole-page previews of the desktop-light PNGs was a viewer downsampling artifact. Direct original-resolution crops from those same files show complete `Primary action` / `Destructive action` and `기본 동작` / `삭제 동작` labels.

## Recommendation

APPROVE.

## Blockers

None.

## Findings

- [product] NOTE — `web/src/components/consumer/ui-primitives-showcase.tsx` is 322 physical lines and exceeds the remove-ai-slops 250 pure-LOC review threshold. It is a cohesive verification showcase and does not violate an Issue #421 success criterion. Evidence: `web/src/components/consumer/ui-primitives-showcase.tsx:28-322`.
- [evidence] NOTE — the fresh Playwright result artifact records only `{status: passed, failedTests: []}` and does not enumerate the nine cases or bind them to a revision. The source defines eight locale/viewport/theme cases plus one keyboard case, but run provenance remains weaker than a full reporter transcript. Evidence: `web/test-results/.last-run.json`; `web/tests/e2e/ui-primitives.spec.ts:49-144`.
- [evidence] NOTE — the showcase E2E emulates reduced motion but does not directly assert computed transition/animation duration. The package-level browser test does assert a near-zero transition duration, and the static contract test verifies the packaged reduced-motion media rule. This supports the criterion, but the showcase-specific claim is broader than its own E2E assertions. Evidence: `web/tests/e2e/ui-primitives.spec.ts:54,111-144`; `web/tests/e2e/blab-parity.spec.ts:46-53`; `web/scripts/test-ui-primitives.mjs:145-146`.
- [evidence] NOTE — `web/scripts/test-ui-primitives.mjs` is largely source-marker validation. Its missing-focus negative fixture removes the same literal selector that the positive check searches for, so it is implementation-coupled and offers little behavioral confidence by itself. The Playwright focus/activation checks and package browser test provide independent observable coverage. Evidence: `web/scripts/test-ui-primitives.mjs:31-57,127-130`; `web/tests/e2e/ui-primitives.spec.ts:111-144`.
- [product] NOTE — development-only React Scan/Grab scripts are unrelated to the visible primitive showcase and add maintenance/network surface, but they are development-gated and no stated success criterion forbids them. Evidence: `web/src/app/layout.tsx:47-61`.

## Direct remove-ai-slops and programming pass

The production UI is live React composition through typed public BLDS adapters; there is no raster substitute, bespoke parser/normalizer, broad catch, unsafe TypeScript escape hatch, debug logging, or duplicated state machine. The adapter wrappers are deliberately thin and establish the requested consumer boundary. The showcase module is oversized under the skill's maintenance rule, and the static positive/negative test pair is implementation-coupled; both are recorded above as notes because neither fails a stated criterion. The browser tests exercise observable semantics, overflow, loading state, keyboard activation, selection, focus, and dismissal. No deletion-only test or test that merely verifies a requested removal is needed for approval.

The existing review reports explicitly discuss both remove-ai-slops/programming perspectives and identify the oversized showcase and overfit static fixture. This direct pass independently reached the same conclusions. Prior report assertions about all desktop-light labels were checked at original resolution rather than accepted from prose.

## Evidence trace

- Contract: `web/DESIGN.md:79-85,91-158,179-188`; `web/docs/blab-react-parity-contract.json`.
- Live composition and all required states: `web/src/components/consumer/ui-primitives-showcase.tsx:51-322`.
- Public typed BLDS adapter boundary: `web/src/components/consumer/blab-primitives.tsx:1-85`.
- Token-driven layout, glass surfaces, CJK wrapping, focus, and responsive breakpoint: `web/src/app/globals.css:156-359`.
- Korean/English copy, including `누르기 피드백` and native-only text: `web/messages/ko.json:367-457`; `web/messages/en.json:367-457`.
- Browser matrix and interaction checks: `web/tests/e2e/ui-primitives.spec.ts:6-144`.
- PNG integrity: all nine files are non-interlaced 8-bit RGB PNGs without alpha; mobile widths are 390, desktop widths are 1440. Korean pages are 3331/2020px tall; English pages are 3496/2040px tall. All are complete full-page composites.
- Duplicate overview: `task-9-bookgolas-web-app-parity.png` and `task-9-ui-primitives-ko-mobile-dark.png` are visually identical and have the same 390x3331 geometry.

## Checked artifact paths

- `web/DESIGN.md`
- `web/docs/blab-react-parity-contract.json`
- `web/docs/blab-react-native-comparison.md`
- `web/src/components/consumer/ui-primitives-showcase.tsx`
- `web/src/components/consumer/blab-primitives.tsx`
- `web/src/app/globals.css`
- `web/messages/ko.json`
- `web/messages/en.json`
- `web/tests/e2e/ui-primitives.spec.ts`
- `web/tests/e2e/blab-parity.spec.ts`
- `web/scripts/test-ui-primitives.mjs`
- `web/scripts/fixtures/ui-primitives-missing-focus.json`
- `web/test-results/.last-run.json`
- `.omo/evidence/bookgolas-web-app-parity/task-9-gate-review.md`
- all nine requested `.omo/evidence/bookgolas-web-app-parity/task-9*.png` files

## Exact evidence gaps

- `omo ulw-loop status --json` cannot resolve `currentAttemptDir` because the installed command points to a missing older OMO runtime. The required fallback report path is therefore used.
- No SHA-bound fresh test reporter transcript enumerates the nine passing browser cases.
- Static captures cannot demonstrate focus or motion states; those are supported by test source and the passed-run status artifact rather than a dedicated visual capture.
- No exact pixel mock exists by brief; review uses the documented BLDS contract and cross-theme/locale consistency.

None of these gaps proves failure of a stated success criterion.
