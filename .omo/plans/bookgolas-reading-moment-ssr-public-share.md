# Bookgolas Reading Moment SSR Public Share Implementation Plan

> **For Hermes:** Use the subagent-driven-development skill to implement this plan task-by-task. This plan describes a bounded product capability; it is not authorization to deploy production, publish a store build, expose private reading data, or claim measured growth outcomes.

**Goal:** Build a privacy-safe, server-rendered public “Reading Moment” page that lets a Bookgolas user publish a selected review/highlight snapshot, share it from Flutter or Web, and give the recipient a fast initial HTML and social-link preview without requiring a Bookgolas session.

**Architecture:** Keep the existing private review, notes/highlights and AI-artifact routes private and owner-scoped. Create an explicit immutable public snapshot projection rather than reading private `books` or `consumer_reading_records` directly from the public route. Render the projection through a new locale-aware App Router route with server-side metadata, cache tags and revoke/expiry invalidation. Keep user-specific read/share events and native actions outside the cacheable public snapshot.

**Tech Stack:** Next.js App Router `next@16.3.0-preview.8`, React 19, TypeScript, `next-intl`, Supabase SSR/client, Zod 4, Vitest, Playwright, Flutter `share_plus`, existing `BookShareService`, existing `webview_flutter` bridge work, Supabase migrations/RLS, and the repository’s browser/release evidence scripts.

**Implementation baseline:** `origin/version/web/1.1.0@52e9c1db19b307200acef66eef73b86122b315d8` for the Web parity surface; delivery base `origin/dev@454d841df3439c335a2a4a87a0fd11355ca18409`.

**Delivery:** This documentation-only plan is intended for `.omo/plans/` on the repository’s `dev` branch through a governance-scoped PR. The repository rejects direct pushes to `dev`; do not bypass the PR ruleset.

---

## Why this feature needs SSR

This is not an SSR demo page. The feature loses product value if it waits for a Bookgolas session and client JavaScript before rendering:

- A KakaoTalk, Discord, messaging or social link preview needs title, image and description from the initial server response.
- A recipient without a Bookgolas account must see the shared reading moment before any sign-in prompt.
- Flutter’s native share sheet and the Web Share API need a stable public URL, not a private authenticated review route.
- Revoke and expiry must be enforced by the server; a client-only visibility flag cannot protect a previously shared link.
- The public snapshot can be cached and revalidated independently from private reading data.
- The same URL should work in an ordinary browser, a Flutter WebView, a cold deep-link launch and a logged-out state.

### Existing evidence and boundary

The Web 1.1.0 line already contains useful adjacent pieces:

- `web/src/app/[locale]/(consumer)/books/[bookId]/review/page.tsx` is an authenticated, `force-dynamic` review route.
- `web/src/app/api/consumer/review-share/route.ts` has typed review generation/save behavior, localized canonical URL construction, private `no-store` responses and path invalidation after save.
- `web/docs/review-share-contract.json` documents Web Share API, clipboard and download fallbacks, but its route remains owner-verified.
- `web/src/app/[locale]/(consumer)/books/[bookId]/mind-map/page.tsx` and `web/src/app/api/consumer/ai-artifacts/route.ts` are private AI-artifact surfaces and must not be exposed as public data directly.
- Flutter has `app/lib/data/services/book_share_service.dart` and native share capability inventory evidence.
- The current consumer `/announcements` route is a placeholder; it is not the right reason to force SSR for this feature.

This plan upgrades the existing review/share product path into a separate public projection. It does not change the privacy meaning of the current private route.

---

## Product behavior

### User flow

```text
Private review / selected highlights
  → user taps “공개 독서 순간 만들기”
  → preview selected fields
  → explicit publication consent
  → server validates owner and creates immutable public snapshot
  → server returns public localized URL
  → Flutter native share sheet or Web Share API opens the URL
  → recipient receives SSR HTML and social metadata without login
  → recipient may open the Bookgolas app/WebView or continue on Web
  → public view/share/CTA events are stored with bounded metadata
  → owner can revoke or expire the snapshot
  → revalidation removes the published body from the public cache
```

### First-slice supported content

- Book title and author.
- Cover image from an approved HTTPS source.
- Optional rating.
- User-selected short review.
- User-selected long review excerpt, bounded to the public contract.
- Up to a bounded number of explicitly selected highlights.
- Locale and publication timestamp.
- CTA to open Bookgolas book discovery or the app/WebView.

### Explicitly excluded from public snapshots

- Email, user ID, avatar URL or private profile data unless a later consented profile feature is approved.
- Full private notes or all reading records.
- Raw Supabase rows.
- Private AI mind maps, insights or recommendations without a separate public-artifact review.
- Source image storage paths or signed URLs that reveal private storage structure.
- Internal request IDs, auth cookies, access tokens or provider errors.
- Unselected highlights or content inferred from the user’s private library.

### Publication states

```text
draft → published → revoked
              ↘ expired
```

- `draft`: only the owner can preview it.
- `published`: public SSR route may read the snapshot if not expired.
- `revoked`: public route returns a safe revoked state or 404 according to product decision; it never renders the old body.
- `expired`: same public safety rule as revoked.
- Re-publishing creates a new `version` or a new `share_id`; it must not silently resurrect a revoked URL.

---

## Contracts

### Public snapshot model

Create a dedicated projection, not a public view over private tables unless the RLS and column projection are proven equivalent.

```text
reading_moment_shares
- id uuid primary key
- owner_id uuid not null references auth.users(id)
- share_token_hash text unique not null
- source_book_id uuid not null
- source_snapshot_version integer not null
- locale text not null check (locale in ('ko', 'en'))
- title text not null
- author text nullable
- cover_image_url text nullable
- rating smallint nullable check (rating between 0 and 5)
- review_excerpt text nullable
- review_body text nullable
- highlights jsonb not null default '[]'
- status text not null check (status in ('draft', 'published', 'revoked', 'expired'))
- version integer not null default 1
- published_at timestamptz nullable
- expires_at timestamptz nullable
- revoked_at timestamptz nullable
- created_at timestamptz not null
- updated_at timestamptz not null
```

Recommended implementation detail:

- Store only a hash of the public token; the raw token is returned once at creation and is never persisted in plaintext.
- Use a cryptographically random opaque `shareId` or token with enough entropy. Do not use sequential book IDs, user IDs or predictable slugs as the public secret.
- Store an immutable snapshot of approved fields so later private edits do not unexpectedly rewrite an already shared page.
- If the product later needs an editable shared page, increment `version`, preserve an audit trail and revalidate the exact tag after the owner confirms the update.

### Share events

```text
reading_moment_share_events
- id uuid primary key
- share_id uuid not null references reading_moment_shares(id)
- owner_id uuid nullable
- event_type text not null check (
    event_type in (
      'impression',
      'open',
      'native_share_started',
      'native_share_succeeded',
      'web_share_started',
      'web_share_succeeded',
      'copy_link',
      'cta_click',
      'revoke',
      'expired_view',
      'invalid_view'
    )
  )
- surface text not null check (surface in ('public_web', 'webview', 'native_share', 'owner_editor'))
- platform text nullable
- referrer text nullable
- request_id uuid nullable
- failure_code text nullable
- metadata jsonb not null default '{}'
- created_at timestamptz not null
```

Event rules:

- Public impression/open events must not identify an anonymous visitor.
- `owner_id` is server-derived only when the owner is authenticated; it is not accepted from a public request body.
- Bound `referrer`, user-agent-derived platform and metadata size; never store arbitrary query strings.
- Use request-ID deduplication for mutation events and rate limits for anonymous event ingestion.
- Event loss must not block public page rendering.

### Public route contract

```text
GET /{locale}/share/reading-moment/{shareId}
```

Route behavior:

- Validate locale and opaque share ID before querying.
- Read only `published` and non-expired projections.
- Return `notFound()` for invalid, revoked or expired shares unless a reviewed product decision requires a neutral revoked page.
- Generate locale-specific `title`, `description`, `openGraph`, `twitter` and canonical URL from the projection.
- Use `robots: noindex` by default because the page may contain personal reading content; an explicit future “public discovery” mode may opt into indexing.
- Render meaningful title, cover, review and selected highlights in the initial HTML.
- Keep interactive share/copy/CTA controls behind a small client boundary.
- Never require the owner’s Supabase session to render a published page.

### Cache and invalidation contract

- Public snapshots may use a bounded cache/revalidation policy.
- Private owner editor routes remain `private, no-store`.
- Publish, revoke, expire and version changes must invalidate the exact share tag and path.
- A revoked snapshot must not remain publicly readable because a previous response was cached.
- If the installed Next.js 16 preview API differs from the repository’s current cache API, verify the supported `revalidateTag`/cache-profile contract before implementation; do not copy an older API signature blindly.
- Cache keys must include locale and share ID; do not allow locale content to cross-contaminate.

---

## Non-goals and safety boundaries

- Do not make `/books/[bookId]/review` public.
- Do not add public access to `consumer_reading_records`, `books`, notes or AI artifact tables.
- Do not expose a raw `bookId` as the only authorization boundary.
- Do not put a Supabase access token in the public URL, page HTML or bridge envelope.
- Do not claim SEO growth; default to `noindex` until a separate discovery decision exists.
- Do not add a follower/social graph, comments or public user profiles in the first slice.
- Do not make public events a critical path for SSR response success.
- Do not call a share count a growth outcome; it is an instrumentation signal until real exposure and product decisions exist.
- Do not implement Streaming SSR solely for resume value. Add it only if a real slow server segment justifies a boundary and the result is measured.

---

## Implementation tasks

### Task 1: Freeze baseline and map the existing private share boundary

**Objective:** Record the exact source boundary so public snapshot work does not accidentally widen private access.

**Files:**
- Reference: `web/src/app/[locale]/(consumer)/books/[bookId]/review/page.tsx`
- Reference: `web/src/app/api/consumer/review-share/route.ts`
- Reference: `web/src/lib/product/contracts/review-share.ts`
- Reference: `web/docs/review-share-contract.json`
- Reference: `app/lib/data/services/book_share_service.dart`
- Reference: `app/lib/data/services/deep_link_service.dart`
- Create: `.omo/evidence/reading-moment-ssr-public-share/baseline.md`

**Steps:**

1. Verify the implementation starts from `origin/version/web/1.1.0@52e9c1db19b307200acef66eef73b86122b315d8`.
2. Record that the current review route is owner-verified and `force-dynamic`.
3. Record that the current review/share API sends `private, no-store` responses and invalidates private paths after save.
4. Record the existing Flutter share capability and the current absence of a public share snapshot route.
5. Keep this evidence file factual; do not describe the future public route as implemented.

**Verification:**

```bash
git rev-parse origin/version/web/1.1.0
node -e "const fs=require('fs'); const p='web/docs/review-share-contract.json'; JSON.parse(fs.readFileSync(p,'utf8')); console.log('review contract ok')"
git diff --check
```

Expected: the baseline SHA is exact, the contract parses and the evidence file contains no unverified launch claim.

---

### Task 2: Define public snapshot schemas before adding storage

**Objective:** Make owner selection, public fields, status transitions and response shapes explicit.

**Files:**
- Create: `web/src/lib/product/contracts/reading-moment-share.ts`
- Create: `web/src/lib/product/contracts/reading-moment-share.test.ts`
- Modify: `web/src/lib/product/contracts/index.ts`
- Create: `web/src/lib/share/reading-moment-snapshot.ts`
- Create: `web/src/lib/share/reading-moment-snapshot.test.ts`

**Required schemas:**

- `ReadingMomentShareIdSchema`
- `ReadingMomentLocaleSchema`
- `ReadingMomentHighlightSchema`
- `ReadingMomentSourceSelectionSchema`
- `ReadingMomentPublishRequestSchema`
- `ReadingMomentRevokeRequestSchema`
- `ReadingMomentPublicResponseSchema`
- `ReadingMomentMetadataSchema`
- `ReadingMomentEventSchema`
- `ReadingMomentFailureCodeSchema`

**Rules:**

1. Reject `user_id`, `owner_id`, `auth_user_id` and equivalent caller-identity fields from all client requests.
2. Limit title, author, review, excerpt, highlight count, highlight length, image URL length and metadata size.
3. Accept only HTTPS image URLs from approved storage/provider patterns; reject `javascript:`, `data:`, private signed URL leakage and unknown protocols.
4. Normalize empty optional strings to `null`.
5. Make the snapshot serializer deterministic so the same input/version produces the same public projection and cache tag.
6. Ensure a public response cannot contain owner ID, email, source row IDs or private fields.

**Verification:**

```bash
cd web
npx vitest run src/lib/product/contracts/reading-moment-share.test.ts src/lib/share/reading-moment-snapshot.test.ts
npm run typecheck
```

Expected: happy, malformed, oversized, caller-identity and private-field negative cases pass.

---

### Task 3: Add the public snapshot migration and RLS

**Objective:** Store an immutable owner-approved public projection with explicit public-read and owner-management policies.

**Files:**
- Create: `supabase/migrations/<generated-timestamp>_create_reading_moment_shares.sql`
- Reference: existing book, review, notes/highlights and RLS migrations
- Create: `web/docs/reading-moment-share-data-contract.json`

**Steps:**

1. Generate the migration using the repository’s Supabase command; never invent the timestamp.

```bash
supabase migration new create_reading_moment_shares
```

2. Add `reading_moment_shares` with the fields and status rules in this plan.
3. Add `reading_moment_share_events` with bounded event types and an index on `(share_id, created_at)`.
4. Add uniqueness for the token hash and an index for published non-expired lookup.
5. Add owner policies for create, preview, update version, revoke and read-back.
6. Do not grant `anon` or `PUBLIC` table-level `SELECT` on `reading_moment_shares`; RLS filters rows but does not by itself remove sensitive columns from a row result.
7. Expose only the approved public projection columns through a dedicated view or security-definer RPC, and grant `anon` access to that projection only. Keep `owner_id`, `source_book_id` and `share_token_hash` inaccessible to the public role.
8. Grant owner/server privileges separately for draft, publish, revoke and read-back operations; do not treat the public projection privilege as an owner privilege.
9. Add public policies only for published, non-expired projection rows. Verify table, view and column privileges with `has_table_privilege`, `has_column_privilege` or the repository’s equivalent RLS/privilege fixture.
10. Ensure revoked/expired rows cannot be returned by the public query even if a caller knows the share ID.
11. Add an explicit migration rollback note; do not use destructive resets against a shared environment.

**Verification:**

```bash
supabase db lint
supabase migration list --local
npm run test:rls
```

If local Supabase is unavailable, run SQL/static validation and record the environment limitation. Do not apply this migration to production.

---

### Task 4: Implement the owner-scoped snapshot DAL

**Objective:** Build the only server-side path that can turn private records into a public snapshot.

**Files:**
- Create: `web/src/lib/product/dal/reading-moment-share.ts`
- Create: `web/src/lib/product/dal/reading-moment-share.test.ts`
- Modify: `web/src/lib/product/dal/index.ts`
- Reference: `web/src/lib/product/dal/context.ts`
- Reference: `web/src/lib/product/dal/errors.ts`
- Reference: `web/src/lib/product/dal/http.ts`
- Reference: `web/src/lib/product/dal/codec.ts`

**DAL operations:**

```text
createDraftFromOwnedBook
readOwnerDraft
publishOwnerSnapshot
revokeOwnerSnapshot
readPublishedSnapshot
recordPublicEvent
```

**Steps:**

1. Resolve the authenticated owner with the existing server session context.
2. Query the source book/review/highlights using owner-scoped filters.
3. Copy only the user-selected fields into a snapshot object.
4. Persist the snapshot and read it back by exact owner and share ID.
5. Publish only after snapshot validation and read-back succeed.
6. Revoke by owner and share ID; never accept owner identity from the request body.
7. Return stable errors for unauthenticated, foreign, deleted, empty-selection, invalid-image, expired and already-revoked cases.
8. Keep the public read operation separate from owner read and never reuse a private query that returns extra columns.

**Verification:**

```bash
cd web
npx vitest run src/lib/product/dal/reading-moment-share.test.ts
npm run typecheck
```

Expected negative cases: foreign book, foreign share, deleted book, revoked share and caller-supplied owner ID all fail closed.

---

### Task 5: Add owner publish, preview and revoke APIs

**Objective:** Give the private product surface explicit controls for selecting and publishing a Reading Moment.

**Files:**
- Create: `web/src/app/api/consumer/reading-moment-share/route.ts`
- Create: `web/src/app/api/consumer/reading-moment-share/[shareId]/route.ts`
- Create: `web/src/app/api/consumer/reading-moment-share/route.test.ts`
- Create: `web/src/app/api/consumer/reading-moment-share/[shareId]/route.test.ts`
- Modify: `web/src/lib/product/contracts/routes.ts`

**Endpoints:**

```text
POST /api/consumer/reading-moment-share
GET  /api/consumer/reading-moment-share/{shareId}
POST /api/consumer/reading-moment-share/{shareId}/publish
POST /api/consumer/reading-moment-share/{shareId}/revoke
```

The exact endpoint split may be simplified if the repository’s route conventions require it, but the state transitions must remain explicit.

**Steps:**

1. Validate the selection and idempotency key.
2. Create a draft preview from the authenticated owner’s book/review/highlight records.
3. Show a server-confirmed preview response before publication.
4. Require an explicit publish action and consent field.
5. Return the public localized URL only after published read-back.
6. Revoke with owner-scoped authorization and exact target read-back.
7. Set `Cache-Control: private, no-store` on all owner API responses.
8. Never return the raw share token after the initial creation response; use the stable public URL thereafter.

**Verification:**

```bash
cd web
npx vitest run src/app/api/consumer/reading-moment-share/route.test.ts src/app/api/consumer/reading-moment-share/[shareId]/route.test.ts
node scripts/test-reading-moment-share.mjs --fixture owner-publish
node scripts/test-reading-moment-share.mjs --fixture foreign-share
node scripts/test-reading-moment-share.mjs --fixture revoke
```

Expected: publication is idempotent, revoke is owner-scoped and every mutation is read back before success.

---

### Task 6: Build the private selection and preview UI

**Objective:** Let a user choose the exact public fields without exposing private data by default.

**Files:**
- Create: `web/src/components/consumer/reading-moment-share-editor.tsx`
- Create: `web/src/components/consumer/reading-moment-share-preview.tsx`
- Create: `web/src/components/consumer/reading-moment-share-state.tsx`
- Modify: `web/src/components/consumer/book-review-client.tsx`
- Modify: `web/src/components/consumer/notes-highlights-client.tsx`
- Modify: `web/messages/ko.json`
- Modify: `web/messages/en.json`
- Create: `web/tests/e2e/reading-moment-share-owner.spec.ts`

**Steps:**

1. Add a clear “공개 독서 순간 만들기” action to the existing review/share surface.
2. Default to no highlights and no public author/profile identity.
3. Let the user select rating, short review, long-review excerpt and individual highlights.
4. Show character/count limits before publish.
5. Render a preview from the server response, not from unsanitized client state alone.
6. Show the exact public URL after publish and provide copy/share/revoke actions.
7. Preserve local draft state if the publish request fails.
8. Provide explicit states for unauthorized, empty selection, network failure, expired source, duplicate publish and revoked snapshot.
9. Ensure focus returns correctly after the preview dialog closes and the publish result is announced to assistive technology.

**Verification:**

```bash
cd web
npx vitest run src/lib/share/reading-moment-snapshot.test.ts
npx playwright test tests/e2e/reading-moment-share-owner.spec.ts --project=chromium
```

Expected: a user can publish only selected fields; private fields never appear in the preview or public URL response.

---

### Task 7: Add the public SSR route and server-rendered content

**Objective:** Make the public Reading Moment useful before hydration and without an authenticated session.

**Files:**
- Create: `web/src/app/[locale]/share/reading-moment/[shareId]/page.tsx`
- Create: `web/src/app/[locale]/share/reading-moment/[shareId]/loading.tsx`
- Create: `web/src/app/[locale]/share/reading-moment/[shareId]/error.tsx`
- Create: `web/src/components/share/reading-moment-public-page.tsx`
- Create: `web/src/components/share/reading-moment-public-actions.tsx`
- Create: `web/src/components/share/reading-moment-public-state.tsx`
- Create: `web/src/lib/share/reading-moment-public-view.ts`
- Create: `web/src/app/[locale]/share/reading-moment/[shareId]/page.test.tsx`

**Step 1: Server query and route**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedReadingMoment } from "@/lib/product/dal/reading-moment-share";
import { ReadingMomentPublicPage } from "@/components/share/reading-moment-public-page";

export default async function ReadingMomentPage({
  params,
}: {
  params: Promise<{ locale: "ko" | "en"; shareId: string }>;
}) {
  const { locale, shareId } = await params;
  const result = await getPublishedReadingMoment({ locale, shareId });
  if (!result.ok || !result.value) notFound();
  return <ReadingMomentPublicPage locale={locale} snapshot={result.value} />;
}
```

This is illustrative. Use the repository’s current Next.js 16 route and cache APIs after verifying their exact signatures.

**Step 2: Metadata**

- Generate localized title and description from the sanitized snapshot.
- Generate canonical URL with locale and share ID.
- Add Open Graph image only from the approved HTTPS image source.
- Add Twitter card metadata.
- Default to `robots: noindex, nofollow`; make indexing an explicit future product decision.

**Step 3: Initial HTML**

- Render title, author when selected, cover, rating, review excerpt/body and selected highlights on the server.
- Keep buttons and Web Share API behind a small client component.
- If the client component fails, the public content remains readable.
- Do not render private loading placeholders as the only initial content.

**Verification:**

```bash
cd web
npx vitest run 'src/app/[locale]/share/reading-moment/[shareId]/page.test.tsx'
npm run typecheck
```

Expected: the route returns a public snapshot without cookies, private fields are absent, invalid shares call `notFound()` and the initial page contains readable content.

---

### Task 8: Add cache tags, publish invalidation and revoke safety

**Objective:** Prove that public SSR remains fresh after publish/revoke without making private data cacheable.

**Files:**
- Create: `web/src/lib/share/reading-moment-cache.ts`
- Create: `web/src/lib/share/reading-moment-cache.test.ts`
- Modify: `web/src/app/api/consumer/reading-moment-share/route.ts`
- Modify: `web/src/app/api/consumer/reading-moment-share/[shareId]/route.ts`
- Modify: `web/src/app/[locale]/share/reading-moment/[shareId]/page.tsx`
- Create: `web/scripts/test-reading-moment-ssr.mjs`

**Steps:**

1. Define one deterministic cache tag builder including locale and share ID.
2. Use the Next.js version-supported cache/revalidation primitive after checking the installed preview documentation/types.
3. Invalidate the exact share tag and path after publish, version update, revoke or expiry.
4. At `expires_at`, hard-invalidate the exact share tag/path or ensure the cache lifetime ends before serving stale content; never rely on a UI-only expired state.
5. Warm the public cache before expiry in a fixture, advance/override the clock, trigger expiry invalidation and verify the same URL no longer returns the previous body.
6. Add a safe no-cache response for owner preview and management APIs.
7. Verify a revoked share cannot be served from a stale public response after invalidation.
8. Verify one locale’s snapshot never appears under another locale.
9. Add a test for a missing tag/profile configuration that fails closed rather than silently keeping stale content.

**Verification:**

```bash
cd web
npx vitest run src/lib/share/reading-moment-cache.test.ts
node scripts/test-reading-moment-ssr.mjs --fixture publish-then-read
node scripts/test-reading-moment-ssr.mjs --fixture revoke-then-read
node scripts/test-reading-moment-ssr.mjs --fixture locale-isolation
```

Expected: publish and revoke read-back show the intended version; no private endpoint becomes cacheable.

---

### Task 9: Connect Flutter native share and WebView entry

**Objective:** Make the SSR URL a real product destination from the existing native share flow.

**Files:**
- Modify: `app/lib/data/services/book_share_service.dart`
- Modify: `app/lib/data/services/deep_link_service.dart`
- Modify: `app/lib/ui/book_detail/widgets/tabs/book_review_tab.dart`
- Reference or modify: `app/lib/data/services/web_content_bridge.dart` if delivered by the hybrid-surface plan
- Reference or modify: `app/lib/ui/core/widgets/bookgolas_web_content_screen.dart` if delivered by the hybrid-surface plan
- Create: `app/test/data/services/reading_moment_share_test.dart`
- Create: `app/test/data/services/deep_link_reading_moment_test.dart`

**Steps:**

1. Replace text-only share output with the published Reading Moment URL after server success.
2. Preserve native share sheet behavior and browser clipboard/download fallback.
3. Add a `reading-moment` deep-link parser that opens the public WebView route without treating it as a private book route.
4. Handle cold start, warm start, resume, invalid share ID and revoked share states.
5. If the WebView bridge is unavailable, open the canonical URL in a safe browser fallback; do not fabricate native success.
6. Return request-correlated share results and keep native share cancellation distinct from failure.

**Verification:**

```bash
cd app
flutter test test/data/services/reading_moment_share_test.dart test/data/services/deep_link_reading_moment_test.dart
flutter analyze lib/data/services/book_share_service.dart lib/data/services/deep_link_service.dart
```

Device gate: verify iOS share sheet, Android share behavior where supported, cold deep link, warm deep link, revoked page and WebView close/back behavior.

---

### Task 10: Add public-page actions and event ingestion

**Objective:** Measure the public surface and CTA behavior without making anonymous events a rendering dependency.

**Files:**
- Create: `web/src/app/api/public/reading-moment/[shareId]/events/route.ts`
- Create: `web/src/app/api/public/reading-moment/[shareId]/events/route.test.ts`
- Create: `web/src/lib/product/dal/reading-moment-share-events.ts`
- Modify: `web/src/components/share/reading-moment-public-actions.tsx`
- Create: `web/tests/e2e/reading-moment-share-public.spec.ts`
- Create: `web/scripts/fixtures/reading-moment-share-negative.json`

**Event types:**

```text
impression
open
native_share_started
native_share_succeeded
web_share_started
web_share_succeeded
copy_link
cta_click
expired_view
invalid_view
```

**Steps:**

1. Emit impression only after the public content is visible, not during server data fetch alone.
2. Add request-ID deduplication for share/copy events.
3. Bound metadata and discard arbitrary query strings/referrers.
4. Rate-limit anonymous event ingestion and return a non-blocking response.
5. Add a small admin read model only if the repository already has an approved admin analytics surface; otherwise keep the first slice to verified event storage/read-back.
6. Distinguish exposure counts from product outcomes; do not call shares or CTA clicks retention/conversion improvement.

**Verification:**

```bash
cd web
npx vitest run src/app/api/public/reading-moment/[shareId]/events/route.test.ts
npx playwright test tests/e2e/reading-moment-share-public.spec.ts --project=chromium
node scripts/test-reading-moment-share.mjs --fixture duplicate-event
node scripts/test-reading-moment-share.mjs --fixture anonymous-rate-limit
```

Expected: public page rendering succeeds even when event ingestion is unavailable; duplicate and oversized events fail safely.

---

### Task 11: Add privacy and security negative coverage

**Objective:** Prove that public SSR does not become an accidental private-data export.

**Files:**
- Create: `web/src/lib/share/reading-moment-security.test.ts`
- Create: `web/scripts/test-reading-moment-share-negative.mjs`
- Modify: `web/docs/native-consumer-surface-inventory.json` only if the new public action changes the documented native boundary
- Create: `web/docs/reading-moment-share-contract.json`

**Negative fixtures:**

- unauthenticated private source access;
- foreign book ID;
- foreign share ID;
- revoked share;
- expired share;
- predictable/short share ID;
- caller-supplied owner ID;
- caller-supplied user ID;
- private email/avatar leakage;
- private notes leakage;
- private AI artifact leakage;
- unsafe HTML/markdown/script injection;
- unapproved image host;
- signed private storage URL leakage;
- locale confusion;
- stale cache after revoke;
- event payload over size limit;
- anonymous event flood;
- WebView origin mismatch;
- share cancellation incorrectly reported as success.

**Verification:**

```bash
cd web
node scripts/test-reading-moment-share-negative.mjs
npx vitest run src/lib/share/reading-moment-security.test.ts
npm run test:session-lifecycle:negative
npm run test:offline-sync:negative
```

Expected: every private-field and ownership fixture fails closed; public published content remains readable without a session.

---

### Task 12: Prove SSR with built-server and no-JavaScript checks

**Objective:** Produce direct evidence of server-rendered HTML, metadata, cache invalidation and WebView-compatible fallback.

**Files:**
- Create: `web/scripts/verify-reading-moment-ssr.mjs`
- Create: `web/tests/e2e/reading-moment-ssr.spec.ts`
- Create: `.omo/evidence/reading-moment-ssr-public-share/ssr-receipt.md`

**Web verification sequence:**

```bash
cd web
npm run typecheck
npm run build
npm run start
```

Run against the built server:

```bash
node scripts/verify-reading-moment-ssr.mjs --url http://127.0.0.1:3000/ko/share/reading-moment/<fixture-share-id>
```

The script must verify:

- HTTP success for a published fixture.
- Initial HTML contains the sanitized title and selected content.
- Initial HTML contains localized `<title>`, canonical URL and Open Graph metadata.
- Initial HTML does not contain owner ID, email, access token or private source identifiers.
- The route remains readable with JavaScript disabled.
- Invalid/revoked/expired share returns the reviewed not-found/revoked response.
- Publish version change is visible after the approved invalidation operation.
- Locale-specific metadata and content do not cross-contaminate.
- Public event failure does not blank the page.

Playwright cases:

```bash
npx playwright test tests/e2e/reading-moment-ssr.spec.ts --project=chromium
```

Use a browser context with `javaScriptEnabled: false` for the no-JS assertion. Do not treat a mocked DOM or source inspection as SSR proof.

---

### Task 13: Add release, rollback and evidence rules

**Objective:** Make the public-share capability operable and career-evidence safe.

**Files:**
- Create: `.omo/evidence/reading-moment-ssr-public-share/release-checklist.md`
- Create: `.omo/evidence/reading-moment-ssr-public-share/rollback.md`
- Modify: `web/README.md` only if the repository’s existing public-route documentation convention requires it
- Modify: `career/projects/2026-09-23-bookgolas-reading-moment-ssr-public-share-plan.md` in the Obsidian vault after implementation evidence exists; do not mark it completed now

**Release checklist:**

- Database migration applied only to approved dev/staging target.
- Public route is `noindex` unless an explicit discovery decision changes it.
- Share token entropy and hash storage reviewed.
- RLS/public projection read-back verified.
- Revoke/expire invalidation verified against a built server.
- Private review route remains `private, no-store`.
- Flutter share and deep-link device checks pass.
- WebView origin allowlist remains unchanged or is explicitly reviewed.
- Event ingestion rate/size limits are active.
- Feature flag or kill switch can disable publication without deleting snapshots.
- Rollback disables new publication, revokes affected snapshots if required and keeps old private review data intact.
- No resume claim is upgraded until code, tests, browser/device evidence and read-back are attached.

---

## Test command inventory

### Web focused checks

```bash
cd web
npm run typecheck
npx vitest run src/lib/product/contracts/reading-moment-share.test.ts src/lib/share/reading-moment-snapshot.test.ts src/lib/product/dal/reading-moment-share.test.ts
npx vitest run src/app/api/consumer/reading-moment-share/route.test.ts src/app/api/public/reading-moment/[shareId]/events/route.test.ts
node scripts/test-reading-moment-share.mjs
node scripts/test-reading-moment-share-negative.mjs
npm run build
npx playwright test tests/e2e/reading-moment-share-owner.spec.ts tests/e2e/reading-moment-share-public.spec.ts tests/e2e/reading-moment-ssr.spec.ts --project=chromium
```

### Flutter focused checks

```bash
cd app
flutter test test/data/services/reading_moment_share_test.dart test/data/services/deep_link_reading_moment_test.dart
flutter analyze lib/data/services/book_share_service.dart lib/data/services/deep_link_service.dart
```

### Required manual matrix

- Owner creates a draft from a review with no highlights.
- Owner selects one highlight and publishes.
- Owner sees public URL only after publish read-back.
- Logged-out browser opens the route and receives SSR HTML.
- Logged-out Flutter WebView opens the same route.
- KakaoTalk/Discord-style unfurl receives localized metadata.
- Native share cancellation is not reported as success.
- Web Share unsupported fallback copies or downloads safely.
- Owner revokes the share; old URL no longer renders the body.
- Expired share is not served from a stale cache.
- Foreign user cannot preview, publish, edit or revoke another user’s share.
- Public route never shows private notes, AI artifacts, email or owner ID.
- A failed anonymous event request does not break the page.
- iOS cold start and warm start work; Android is recorded only where actually verified.

---

## Evidence and career boundary

### Direct evidence after implementation

- A real public Reading Moment product flow connected to existing review/share behavior.
- Next.js App Router SSR route with initial HTML and localized metadata.
- Public snapshot projection separate from private records.
- Cache tag/revalidation and revoke/expiry invalidation.
- Flutter/native share and WebView/browser fallback.
- RLS, ownership, privacy and negative-fixture coverage.
- Browser no-JavaScript proof and built-server read-back.
- Real-device cold/warm share/deep-link evidence where tested.

### Transferable but not proven

- Search-engine growth or organic traffic.
- Retention, conversion or viral coefficient improvement.
- Daangn-scale public content traffic.
- Long-running production SLO/incident ownership.
- Public AI artifact safety at scale.
- Android native bridge parity unless the Android device gate passes.

### Safe resume wording before production observation

> 북골라스에서 사용자 선택형 독서 기록을 공개 snapshot으로 분리하고, Next.js App Router의 서버 렌더링·localized metadata·cache revalidation·공개/비공개 데이터 경계를 검증하는 Reading Moment 공유 흐름을 설계·구현했습니다.

Only use “운영” or an outcome metric after a real deployed environment and read-back prove it.

---

## Delivery protocol for this plan

This plan file is documentation-only and must be committed separately from product implementation.

```bash
cd /path/to/book-golas
git status --short --branch
git diff --check
git add .omo/plans/bookgolas-reading-moment-ssr-public-share.md
git diff --cached --check
git commit -m "docs(governance): plan reading moment ssr public share" \
  -m "- 공개 독서 기록 snapshot과 SSR metadata/cache/revoke 경계 계획 추가" \
  -m "- WebView/native share, privacy, RLS, negative fixture와 built-server 검증 기록"
git push -u origin codex/docs/governance/1.0.0/reading-moment-ssr-public-share-plan
```

Open a PR into `dev` with these metadata lines exactly once:

```text
Target-Delivery-Unit: governance
Target-Version: 1.0.0
Delivery-Profile: package-or-local
```

Use the repository-required merge commit. After merge, verify the exact `.omo/plans` file on `dev` and delete the temporary feature branch.
