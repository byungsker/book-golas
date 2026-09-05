# Bookgolas Web Admin Design Contract

Status: issue #395 design-system gate. This is an extraction of the existing Web admin surface, not a UI implementation. It is the implementation contract for the operational monitoring dashboard and must be read before changing the dashboard.

Source of truth inspected: `web/src/app/globals.css`, `web/src/app/layout.tsx`, `web/src/app/admin/layout.tsx`, `web/src/app/admin/page.tsx`, `web/src/app/admin/ai-usage/page.tsx`, `web/src/app/admin/ai-monitor/page.tsx`, `web/src/app/api/admin/ai-usage/route.ts`, `web/src/app/api/admin/ai-monitor/route.ts`, `web/src/lib/ai-usage.ts`, `web/src/lib/ai-monitor.ts`, `ai-monitor/src/core.mjs`, and `web/src/components/ui/*`.

## 1. Atmosphere & Identity

The admin surface is a quiet operational console: neutral, information-dense, and easy to scan when an operator is checking health, failures, latency, quota, and cost. Its signature is semantic evidence in simple layers—`Card` sections, compact metric cards, and readable tables—rather than decorative dashboard chrome. Keep the AI monitoring view calmer and more explicit than the consumer-facing visual utilities in `globals.css`.

Scope for issue #395: the AI monitoring dashboard at `/admin/ai-monitor`, alongside the existing `/admin/ai-usage` view. The existing admin shell, authentication, API contract, and other admin workflows remain in place. Do not turn this document into a second component library or change the shell as part of the dashboard work.

## 2. Color

Use the CSS variables already defined in `globals.css` through their Tailwind semantic names. Do not add a parallel palette or new global variables for the dashboard.

### Semantic roles

| Role | Existing token / utility | Contract |
| --- | --- | --- |
| App canvas | `bg-background`, `text-foreground` | Page background and primary text. Both light and `.dark` themes are already defined. |
| Card surface | `bg-card`, `text-card-foreground` | `Card` is the default dashboard section and metric surface. |
| Popover surface | `bg-popover`, `text-popover-foreground` | Radix `SelectContent` and future overlays only. |
| Primary action | `bg-primary text-primary-foreground` | `Button` default variant for 조회/submit and other primary actions. |
| Secondary action | `bg-secondary text-secondary-foreground` | `Button` secondary variant when the action is not primary. |
| Quiet interaction | `bg-accent text-accent-foreground`, `muted` | Hover, selected navigation, selected rows, and low-emphasis controls. |
| Supporting text | `text-muted-foreground` | Descriptions, timestamps, table secondary values, helper text, and empty-state copy. |
| Boundaries | `border-border`, `border-input` | Card/table dividers and form-control borders. |
| Keyboard focus | `ring`, `ring-ring/50` | Preserve the existing visible focus treatment; never remove it to make a surface quieter. |
| Destructive / critical | `destructive`, `text-destructive`, `border-destructive/50`, `bg-destructive/5` | Auth/API failures, critical health, and destructive actions. Pair with a text label, not color alone. |
| Healthy | Existing AI usage mapping: `border-emerald-500/40 bg-emerald-500/5 text-emerald-700` | `health.status === "healthy"`; retain the explicit “정상” label. |
| Warning | Existing AI usage mapping: `border-orange-500/40 bg-orange-500/5 text-orange-700` | `health.status === "warning"`, row-limit notices, and caution copy. |
| Informational chart/accent | `chart-1` … `chart-5`, plus existing `blue-500`/`blue-400` utilities | Only for genuinely distinct series or existing push-dashboard progress/link treatment. A series needs a label or legend. |

### Theme token values (current `globals.css`)

These are the existing CSS variable values, recorded for traceability. Use the semantic names above in UI code.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--card`, `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--card-foreground`, `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--secondary`, `--muted`, `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--secondary-foreground`, `--accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` |
| `--chart-2` | `oklch(0.6 0.118 184.704)` | `oklch(0.696 0.17 162.48)` |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)` |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)` |
| `--chart-5` | `oklch(0.769 0.188 70.08)` | `oklch(0.645 0.246 16.439)` |

### Rules

- Prefer semantic tokens above over raw colors. The existing `blue-*`, `green-*`, `orange-*`, `red-*`, and gray utilities are legacy/admin exceptions; do not multiply them in new dashboard UI.
- Status must be understandable from text (`정상`, `주의`, `위험`, `확인 필요`, failure counts, or an explanatory message) as well as color.
- Costs are estimates, not accounting values. Keep the existing disclosure visible: estimated provider-token/model-price values are not billing or accounting numbers.
- Never expose user original text, input/output content, or user identifiers in this dashboard response or its presentation.
- The marketing-oriented `.glass`, `.mesh-gradient`, `.text-gradient`, and glow utilities are not part of the admin monitoring surface.

## 3. Typography

### Existing type foundation

- `web/src/app/layout.tsx` loads `Plus_Jakarta_Sans` as `--font-body` and `Space_Grotesk` as `--font-display`; the body inherits `var(--font-body)`.
- Admin pages currently use the inherited body face with Tailwind weight/size utilities. Do not introduce another font family for issue #395.
- Preserve Korean text and the existing `lang="ko"` document context. Numeric values, dates, function names, model names, and `$` cost values must remain legible in the body fallback stack.

### Admin scale

| Use | Existing class / size | Contract |
| --- | --- | --- |
| Page title | `text-2xl font-bold` | One primary title, such as “AI 운영 대시보드”. |
| Card title | `CardTitle` (`font-semibold`, usually base size) | Section names: 조회 조건, 비용 통제 정책, 함수별 운영 지표, and so on. |
| Metric value | `text-2xl font-bold` | AI usage KPI values; the legacy push dashboard uses `text-3xl` and should not force that size here. |
| Body / description | `text-sm`, `CardDescription` | Explanations, filters, table content, and action labels. |
| Supporting / disclosure | `text-xs` | Metric detail, status detail, and privacy/cost disclosure only. Never use it for the only explanation of a critical state. |
| Function/model/email value | existing `font-medium` or `font-mono text-sm` where code-like | Use mono only for code-like identifiers; keep a readable fallback. |

Use `font-medium` for table identifiers and `text-muted-foreground` for supporting values. Keep headings short enough to avoid four-line wrapping. Do not add arbitrary text sizes or tracking values. Existing `font-sans`/`font-mono` theme aliases point at `--font-geist-sans`/`--font-geist-mono` while the root layout exposes body/display variables; this is a known token inconsistency, not a reason to add a new font alias in issue #395.

## 4. Spacing & Layout

The admin shell establishes the page geometry:

- `AdminLayout` is a document-scrolling `min-h-screen bg-background` shell. Its top nav is a normal-flow `bg-card border-b border-border` region; it is not fixed or sticky.
- Content is limited by `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` and has `py-6` vertical padding.
- Dashboard sections use a vertical `space-y-6` stack.
- Use the existing 4px Tailwind spacing scale: `gap-2`/`space-y-2` for label-field groups, `gap-3` for compact rows, `gap-4` for KPI/filter grids, `gap-6` for major sections, `p-6`/`px-6` for card content, and `py-3 px-2` for table cells.
- `Card` supplies `rounded-xl border py-6 shadow-sm`; `CardHeader` and `CardContent` supply `px-6`. Compose these primitives instead of inventing a dashboard panel style.

### Monitoring page anatomy

Use this order so an operator can move from context to action:

1. Page title, purpose sentence, and a `Button variant="outline"` refresh action.
2. `Card` containing the date/function filters and primary 조회 action.
3. Inline error card, when the query fails.
4. KPI groups: usage totals, health/latency/outcome metrics, and control events.
5. Cost-control policy card and any row-limit warning.
6. Function, feature·model, and daily tables.
7. Cost/privacy disclosure card.

### Responsive behavior

- Keep the existing breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px. These are Tailwind defaults already used by the Web app; do not create device-specific breakpoints.
- At narrow widths, the page title/actions stack (`flex-col`, then `sm:flex-row`); the filter form is one column until `md`, where it becomes three flexible fields plus the action; KPI grids are one column, then two at `sm`, then four at `xl`.
- The control-event summary is one column until `sm`, then three. Policy facts are one column until `sm`, then three.
- Tables may own a local horizontal overflow region (`overflow-x-auto`) when their columns cannot compress. The page itself must remain one readable column with no horizontal scrollbar. Function/model names and unbroken tokens need `min-w-0`/wrapping or deliberate table overflow.
- Use the layout primitives `stack`, `cluster`, `intrinsic grid`, and `scroll-body-shell` vocabulary when handing implementation details off. There is no nested dashboard scroll container today; document-level scroll remains the owner unless a bounded table region has a named job.
- Preserve the current admin shell behavior: nav links are hidden below `sm`. This is an existing shell limitation recorded as debt in Section 8; the dashboard must not add another inaccessible navigation path.

## 5. Components & Operational Data Contract

Issue #395 should compose existing primitives from `web/src/components/ui`, not add dashboard-only replacements.

### Card / MetricCard

- **Structure**: `Card` → `CardHeader` (`CardDescription` or `CardTitle`) → `CardContent` (value and supporting line).
- **Variants**: neutral metric; health-status metric using the existing healthy/warning/critical/unknown mapping; section card with title/description.
- **Spacing**: base `Card` spacing; `CardHeader className="pb-2"` for metrics; `CardContent` and `px-6` from the primitive; page/grid gaps from Section 4.
- **States**: default; loading with the same reserved metric region and “로딩 중...” status; empty with centered `py-8` muted copy; error with `border-destructive/50` and `text-destructive`; health status `healthy`, `warning`, `critical`, or `unknown`. Hover is not a dashboard affordance unless the card becomes interactive.
- **Accessibility**: give each metric a visible label and supporting interpretation; do not rely on color. If a health card is live-updated, expose the changed status as a polite status, not a repeated disruptive alert.
- **Layout**: intrinsic KPI grid; cards stretch to the row height without forcing a fixed page height.

### Filter form / Button / Input / Label / Select

- **Structure**: labeled field groups (`Label` above `Input` or Radix `Select`) in a form, followed by `Button type="submit"`; keep the existing IDs and visible labels.
- **Variants**: date range (`from`, `to`), function filter (`all` plus returned function names), primary 조회, outline 새로고침.
- **Spacing**: field `space-y-2`, form `gap-4`, one-column-to-four-track responsive grid already used by AI usage.
- **States**: default; hover; active/pressed; visible keyboard focus; disabled while submitting/loading; invalid date range; loading fetch; error response. Draft filter values remain distinct from applied values until 조회 is submitted.
- **Accessibility**: native date inputs stay associated with `Label`; Radix Select retains arrow-key navigation, Enter/Space open, Escape close, selected indicator, and focus return. Buttons must have concise visible labels. `disabled` must not be the only explanation for why an action is unavailable.
- **Layout**: fields may stretch; the action remains a fit-content control at `md` and a full-width row item when stacked.

### Data table

- **Structure**: prefer the existing `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, and `TableCell` primitives. The current AI usage page has equivalent raw tables inside `overflow-x-auto`; preserve its visual contract while converging new work on the shared primitive.
- **Variants**: function metrics; feature·model metrics; daily metrics. Right-align numeric columns; keep identifiers left-aligned.
- **Spacing**: `text-sm`, header/cell padding equivalent to `px-2 py-3`, `border-b border-border`, and last-row border removal.
- **States**: default rows; hover (`hover:bg-muted/50` when using `TableRow`); empty centered `py-8` muted message; loading reserved region; error outside the table in the error card; truncated result warning near the affected data.
- **Accessibility**: use a real table with a caption or adjacent accessible section heading, column headers with `scope="col"`, and no layout-critical information hidden only in hover. Preserve the local overflow container and readable focus order.
- **Layout**: table container owns horizontal overflow only when required; it never becomes a second vertical page scroll owner without an explicit bounded-height contract.

### Badge / Dialog / Switch

- **Structure**: `Badge` for compact labels, Radix `Dialog` for confirmation, and Radix `Switch` for boolean settings in other admin workflows.
- **Variants**: existing badge `default`, `secondary`, `destructive`, and `outline`; use `outline` for neutral identifiers and semantic status styling only when the text repeats the meaning.
- **States**: badge status; dialog open/closed with overlay and close control; switch checked/unchecked/disabled/focused. Their Radix `data-[state]` behavior is the source of truth.
- **Accessibility**: dialogs must provide `DialogTitle` and `DialogDescription`, trap focus, return focus to the trigger, and expose a labeled close control. Switches need an associated label and must not be the sole carrier of a dangerous state.

### Dashboard response contract

The page uses the shared `ai-monitor/src/core.mjs` normalization and aggregation contract over `ai-monitor/fixtures/events.json` for its local and protected Preview server-rendered demo. `web/next.config.ts` sets the repository tracing root and explicitly packages both shared files for the page and API functions. The authenticated endpoint `/api/admin/ai-monitor` exposes the same safe report shape to authorized consumers with `Cache-Control: no-store`; it never returns raw event payloads. Filters are UTC dates, default to the deterministic demo range, and may cover at most 31 days. The response contract is:

| Area | Existing fields / meaning |
| --- | --- |
| Totals | requests, successes, failures, cancellations, input/output/total tokens, average and p95 latency/TTFT, estimated cost, and error rate |
| Provider/model | request, token, latency, error, cancellation, and estimated-cost groups |
| Feature/model | feature·provider·model combinations with request, token, error, cancellation, and estimated-cost values |
| Daily | UTC date groups with request, latency, error, cancellation, and cost values |
| Recent errors | timeout/rate-limit/provider error type, bounded error code, trace ID, and correlation ID only |
| Traces | event, trace, correlation, span, provider, model, status, and outcome identifiers only |
| Health | healthy/warning/critical/unknown based on error-rate and p95 thresholds |
| Options and pagination | bounded provider/model choices plus page, page size, total items, and total pages |

The dashboard is observational. It does not imply that estimated cost is a bill, that a missing value is zero, or that `unknown` health is healthy. Keep the existing disclosure that estimated provider-token/model-price values are not billing or accounting numbers. Do not expose user original text, input/output content, or user identifiers in the response or presentation.

## 6. Motion & Interaction

Interaction is functional and restrained. Existing primitives provide `transition-colors`, `transition-[color,box-shadow]`, `transition-all`, focus rings, disabled opacity, and Radix open/closed animation classes. Reuse those behaviors; do not add a new motion library or decorative dashboard animation.

- **Refresh/query**: submit or refresh changes the applied range, reserves the content region, and exposes “로딩 중...” until the response settles. Do not leave old values styled as current after a failed request.
- **Filter validation**: when `from > to`, keep the form usable, show the existing Korean validation message, and do not issue the request.
- **Health**: status changes are communicated by the visible status label and explanatory detail. Do not pulse or continuously animate a healthy state.
- **Tables**: row hover is a scan aid only. No row should look clickable unless it has an action and keyboard behavior.
- **Timing**: keep existing component transitions; if a new transition is necessary, use the architecture defaults of micro 100–150ms and standard 200–300ms, transform/opacity where motion is needed, and no layout-property animation.
- **Reduced motion**: honor `prefers-reduced-motion: reduce` by removing non-essential enter/exit or emphasis motion. Functional state changes and focus indication remain.

## 7. Depth & Surface

Use the existing mixed surface treatment: `Card` provides `bg-card`, `border`, `rounded-xl`, and `shadow-sm`; the page canvas is `bg-background`; separators use `border-border`. Keep elevation quiet and functional. Do not use the marketing `.glass`, gradients, glow, or phone-shadow utilities for admin monitoring.

- Cards communicate grouping and hierarchy; do not wrap every table row or metric in another card.
- Status cards may use the existing tinted border/background mappings from Section 2, but tint never replaces the text status.
- Tables use divider lines and `hover:bg-muted/50` when composed from `TableRow`; do not add heavy shadows or decorative gradients.
- Keep the existing radius scale derived from `--radius: 0.625rem` (`rounded-md` controls, `rounded-xl` cards, `rounded-full` badges/progress). Do not add a second radius scale.

## 8. Accessibility Constraints, Demo Safety & Accepted Debt

### Accessibility constraints

- Target WCAG 2.2 AA: 4.5:1 minimum for normal text, 3:1 for large text and meaningful non-text boundaries, visible focus for every interactive control, full keyboard reachability, and no information conveyed by color alone.
- Keep the existing `Label` associations, semantic headings, native form controls, Radix keyboard behavior, and `Button` focus-visible rings.
- Give loading regions `role="status"`/polite semantics and query/API failures an alert semantics appropriate to their severity; avoid duplicate announcements for the same state.
- Tables need semantic headers and a usable reading order at zoom. When horizontal scrolling is required, do not hide the table’s purpose or headers.
- Test at 200% zoom, keyboard-only navigation, reduced motion, and narrow widths. Long function/model names, dates, and localized Korean/English labels must not clip critical meaning.

### Safe demo mode for local and protected Preview

A fixture/demo view is permitted only to make the contract inspectable before real data exists. It is not an authentication fallback.

- Gate demo rendering server-side through one shared access check. Local access requires `NODE_ENV === "development"`, the server-only `AI_MONITOR_LOCAL_DEMO === "true"` flag, and a loopback host allowlist limited to `localhost`, `127.0.0.1`, and `[::1]`. Preview access requires `VERCEL_ENV === "preview"`, the server-only `AI_MONITOR_PREVIEW_DEMO === "true"` flag, and an exact request-host match with the deployment host in `VERCEL_URL` (normalize the request host; do not trust an arbitrary client flag or forwarded host without validation).
- Keep the local demo command bound to `127.0.0.1` so the safe fixture cannot be reached from a LAN by default; the API still requires administrator authentication.
- Keep demo data at the page/view layer. `/api/admin/ai-monitor` must continue to call `requireAdminUser()` first and return `401` for an unauthenticated request in every environment, including local development.
- Enable `AI_MONITOR_PREVIEW_DEMO=true` only in the protected Vercel Preview environment. Keep Vercel Deployment Protection enabled, share the exact deployment URL, and keep production disabled because `VERCEL_ENV` must be `preview`.
- Mark the surface visibly as local demo data and ensure fixture values cannot be sent to provider APIs, persisted to Supabase, or mistaken for live observations.

### Known deviations & accepted debt

These are observations from the existing Web system, recorded so issue #395 does not silently expand scope. Do not “fix” them in unrelated files as part of this design gate.

| Item | Location | Why accepted | Owner / exit |
| --- | --- | --- | --- |
| Admin nav uses emoji characters as icons and hides links below `sm` without a mobile replacement. | `web/src/app/admin/layout.tsx` | Existing shell behavior; changing navigation is outside the issue #395 dashboard contract. | Web UI owner; revisit in an admin-shell accessibility pass. |
| Several existing admin screens use raw `blue-*`, `green-*`, `orange-*`, `red-*`, gray, and inline status colors. | Existing admin pages, including `web/src/app/admin/page.tsx` and `ai-usage/page.tsx` | Preserve current screens while the contract establishes semantic usage for new monitoring work. | Web UI owner; consolidate during the next admin visual cleanup. |
| Root body sets hard-coded `#0D0F1A`/`#FAFAFA`, while the admin shell uses theme variables. | `web/src/app/layout.tsx` | Existing shared root behavior; no CSS change is authorized here. | Web UI owner; reconcile root theme ownership separately. |
| `@theme` maps `font-sans`/`font-mono` to Geist variables while the root loads body/display variables. | `web/src/app/globals.css`, `web/src/app/layout.tsx` | Existing alias mismatch; adding another alias would create a parallel typography system. | Web UI owner; resolve after verifying all consumers, including code-like table values. |
| The AI usage page currently uses raw HTML tables inside `overflow-x-auto` even though shared Table primitives exist. | `web/src/app/admin/ai-usage/page.tsx` | The contract preserves the rendered behavior while directing future dashboard work toward shared primitives. | Web UI owner; converge during implementation only if issue scope allows. |

No new accessibility debt is accepted for the issue #395 dashboard. Any deviation from these constraints must be added here with affected users, location, reason, owner, and exit criteria before implementation proceeds.
