# Bookgolas Web Design System

## 1. Atmosphere & Identity

The authenticated consumer surface is a quiet reading workspace with a tactile glass layer between the reader and their records. The signature is semantic BLab glass: light or dark tonal surfaces, restrained blue primary actions, and a soft press response that makes every state change feel deliberate. Marketing and admin surfaces keep their existing visual contracts and do not inherit consumer styling from this document.

## 2. Color

### Palette

BLab is the authority. Consumer components use the public BLDS CSS variables below; they must not introduce local hex values or a second semantic palette.

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Scaffold | `--blab-surface-scaffold` | `#fafafa` | `#121212` | Consumer page background |
| Surface | `--blab-surface` | `#ffffff` | `#1e1e1e` | Controls and elevated content |
| Card | `--blab-surface-card` | `#ffffff` | `#1e1e1e` | Reading and state cards |
| Elevated | `--blab-surface-elevated` | `#f8f9fa` | `#2c2c2e` | Dialog or popover surfaces |
| Primary text | `--blab-text-primary` | `#000000` | `#ffffff` | Headings and body copy |
| Secondary text | `--blab-text-secondary` | `rgba(0,0,0,.87)` | `rgba(255,255,255,.87)` | Supporting content |
| Tertiary text | `--blab-text-tertiary` | `rgba(0,0,0,.6)` | `rgba(255,255,255,.6)` | Hints and metadata |
| Primary action | `--blab-color-primary` | `#5b7fff` | `#5b7fff` | CTA, selected and focus accent |
| Error | `--blab-color-error` | `#ff3b30` | `#ff3b30` | Error and destructive state |
| Success | `--blab-color-success` | `#10b981` | `#10b981` | Completion feedback |
| Warning | `--blab-color-warning` | `#ff9500` | `#ff9500` | Caution feedback |
| Glass fill | `--blab-glass-fill` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.12)` | Glass controls and cards |
| Glass border | `--blab-glass-border` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.15)` | Subtle surface edge |

### Rules

- Import `@byungsker/blab-design-system/styles.css` once from the root layout and consume its public CSS variables in consumer UI.
- Accent color is reserved for actions, selection and focus. Existing landing gradients and admin shadcn variables remain scoped to those surfaces.
- Error, unauthorized, consent, quota and offline states are explicit components with localized copy. They never rely on color alone.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Page title | `clamp(1.875rem, 4vw, 2.25rem)` | 600 | 1.2 | Consumer route heading |
| Section title | `1.125rem` / `--blab-font-size-title-medium` | 600 | 1.3 | Card and section heading |
| Body | `1rem` / `--blab-font-size-body-large` | 400 | `--blab-line-height-body-large` | Primary copy and controls |
| Body small | `--blab-font-size-body-medium` | 400 | `--blab-line-height-body-medium` | Supporting copy |
| Label | `--blab-font-size-label-small` | 500 | 1.4 | Field and status labels |

### Font Stack

- Display: `var(--font-display)` (`Space Grotesk`, loaded by the existing root layout).
- Body: `var(--blab-font-body)` with `var(--font-body)` retained by the existing root layout for product shell copy.
- Mono: system monospace only for developer evidence; no consumer copy uses it.

### Rules

- Consumer copy follows the BLDS body and label scale. Page headings may use the existing responsive display treatment.
- Body text stays at or above 14px. Long localized labels wrap inside their container rather than clipping.

## 4. Spacing & Layout

### Base Unit

All consumer spacing derives from BLDS 4px increments.

| Token | Value | Usage |
|-------|-------|-------|
| `--blab-space-xs` | 4px | Icon and label gap |
| `--blab-space-sm` | 8px | Compact control groups |
| `--blab-space-md` | 12px | Field and state internals |
| `--blab-space-lg` | 16px | Card and section rhythm |
| `--blab-space-xl` | 20px | Comfortable card padding |
| `--blab-space-xxl` | 24px | Page and showcase sections |
| `--blab-space-control-vertical` | 14px | Text-field control padding |
| `--blab-space-control-horizontal` | 16px | Text-field control padding |
| `--blab-size-touch-target` | 44px | Minimum interactive target |

### Grid

- Consumer content uses a centered max-width of 1152px (`max-w-6xl`) with 16px mobile and 24px desktop gutters.
- The primitive showcase uses a single-column stack on narrow screens and a two-column grid where intrinsic content permits it. Cards own their content; the page owns vertical scrolling.
- Responsive checkpoints are 390x844 and 1440x900 for the contract, with normal browser reflow between them.

### Rules

- Use BLDS spacing variables for intent. `minmax()`, `clamp()`, percentages and intrinsic sizing remain browser mechanics.
- No consumer primitive may create horizontal overflow at 390px. Long labels and localized state messages must reflow.

## 5. Components

### ConsumerButton

- **Structure**: public `BLabButton` with a native `button` element at the consumer adapter boundary.
- **Variants**: `primary`, `secondary`, `destructive`; full-width when the action owns a narrow mobile row.
- **Spacing**: BLDS button padding, 52px minimum height, 44px minimum touch target.
- **States**: default, hover, active, focus-visible, disabled, loading.
- **Accessibility**: localized text or accessible child content, native button semantics, `aria-busy` while loading, keyboard activation.
- **Motion**: BLDS press scale and reduced-motion transition removal.
- **Layout**: cluster item; the parent owns button grouping.

### ConsumerCard

- **Structure**: public `BLabCard`, static or keyboard-operable pressable `div`.
- **Variants**: static, interactive, disabled.
- **Spacing**: BLDS card padding and card radius.
- **States**: default, hover, active, focus-visible, disabled.
- **Accessibility**: interactive cards expose `role="button"`, `tabIndex`, `aria-disabled` and Enter/Space activation through BLDS.
- **Motion**: BLDS press scale and brightness feedback; no layout animation.
- **Layout**: stack item or grid item; page/grid owns placement.

### ConsumerTextField

- **Structure**: public `BLabTextField` with label, hint, input or textarea and optional error.
- **Variants**: single-line, multiline, password, error, disabled, read-only.
- **Spacing**: BLDS field gap and control padding.
- **States**: empty, filled, focus-visible, disabled, invalid, clearable.
- **Accessibility**: label association or explicit `ariaLabel`, `aria-invalid`, described error/hint relationship, native input semantics.
- **Motion**: BLDS control transition; reduced motion removes non-essential transition.
- **Layout**: stack item; form owns field grouping and validation summary.

### ConsumerStateFeedback

- **Structure**: public `BLabLoadingState`, `BLabEmptyState`, `BLabErrorState` and `BLabRetryButton`.
- **Variants**: loading, empty, error, retryable error; product-owned unauthorized, consent, quota and offline copy composes these states.
- **Spacing**: BLDS state message max width and section rhythm.
- **States**: loading, empty, error, retry pending, unavailable boundary.
- **Accessibility**: loading/empty use status semantics; errors use alert semantics; retry is a native button; copy is localized and actionable.
- **Motion**: spinner and state transitions obey `prefers-reduced-motion`.
- **Layout**: centered stack inside the owning route/card; the route owns navigation recovery.

### ConsumerNavigation

- **Structure**: public `BLabTabBar`, `BLabBottomBar` and `BLabSegmentedControl` adapters for the five-tab shell, local tabs and mode selection.
- **Variants**: tab list, persistent bottom navigation, segmented selection.
- **Spacing**: BLDS tab, bottom-bar and segmented-control variables.
- **States**: selected, unselected, focus-visible, keyboard navigation, disabled boundary where the feature is unavailable.
- **Accessibility**: named tablist or nav, roving tab focus, arrow-key movement, selected/current state exposed to assistive technology.
- **Motion**: BLDS indicator and press timings; reduced motion removes non-essential transitions.
- **Layout**: shell navigation owns its fixed/persistent position; route content owns the main scroll region.

### ConsumerOnboarding

- **Structure**: a centered three-page feature panel composed from `ConsumerButton` and `ConsumerCard`, followed by an age-policy dialog with two card choices.
- **Variants**: Korean and English copy; reading, capture and goals pages; under-14 and 14-or-older age choices.
- **Spacing**: BLDS spacing variables, 120px feature icon surface and the existing 390px mobile gutter contract.
- **States**: loading local state, pages 1-3, age choice, persistence error and completed handoff.
- **Accessibility**: one page heading at a time, named progress indicators, native buttons, modal semantics, visible focus and a live persistence error.
- **Motion**: the current page fades with the BLDS navigation timing; reduced motion removes the transition.
- **Layout**: the onboarding page owns viewport scrolling and keeps controls reachable at 390x844 without horizontal overflow.

### Primitive Showcase Gate

`/[locale]/ui-primitives` is an unlinked, authenticated-free verification surface for the shared contract. It renders every BLDS adapter in Korean and English and exposes loading, empty, error/retry, unauthorized, consent, quota and offline examples. It is covered at 390x844 and 1440x900 with light/dark color schemes, keyboard actions, focus rings and reduced motion before later consumer screens compose new primitives.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Press | `--blab-motion-press` / 150ms | ease | Button/card press feedback |
| Surface | `--blab-motion-surface` / 180ms | ease | Control surface transition |
| Navigation | `--blab-motion-navigation` / 300ms | ease-out | Tab and surface movement |
| Spinner | `--blab-motion-spin` / 800ms | linear | Loading indicator |

### Rules

- Use BLDS interaction behavior and public exports. New consumer CSS only scopes layout and focus containment; it does not fork BLDS visuals.
- Animate transform, opacity, filter or the package-provided indicator. Do not animate layout properties.
- Every interactive primitive supports pointer, keyboard and visible focus. `prefers-reduced-motion: reduce` disables non-essential transitions and spinner motion while keeping state changes visible.

## 7. Depth & Surface

### Strategy

Mixed BLDS glass surfaces: tonal scaffold and card surfaces provide hierarchy, while the package glass fill, subtle border, blur and elevation tokens supply tactile depth. Consumer code references the semantic variables below rather than adding a local shadow scale.

| Level | Token | Usage |
|-------|-------|-------|
| Glass | `--blab-glass-fill` + `--blab-glass-border` | Controls, cards and navigation |
| Surface | `--blab-elevation-subtle` | Segmented and compact controls |
| Elevated | `--blab-elevation-surface` + `--blab-glass-card-blur` | Layered consumer surfaces |

The marketing `.glass`, gradient and glow utilities and the admin shadcn surface variables remain isolated to their existing route families.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target: 4.5:1 for normal body text and 3:1 for large text or UI boundaries where applicable.
- Every interactive element has a visible focus ring, an accessible name, keyboard reachability and a minimum 44px target where the BLDS component defines one.
- State feedback exposes the correct status or alert semantics, preserves safe retry/return actions and never communicates state through color alone.
- Korean and English are first-class locales. Reduced motion is respected at the package and consumer scopes.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| Landing and admin primitives retain shadcn/local styling | `web/src/components/ui/`, landing routes, admin routes | Their visual contract predates the authenticated consumer BLab boundary and is explicitly isolated by #421 | Future surface-specific migration issue; do not change during consumer parity work |
| Browser Push, camera/OCR, share and subscription remain capability boundaries | `web/docs/consumer-parity-matrix.md` | Web 1.1.0 is online-core and native-only or browser-equivalent behavior needs feature-owned evidence | #428, #435, #443, #444, #445 |
