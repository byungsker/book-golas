# Third-party AI consent rollout

## Contract

- `public.third_party_ai_consents` is the authoritative current account-level receipt.
- `public.third_party_ai_consent_events` preserves server-timestamped grant and withdrawal evidence, and a database trigger rejects update or deletion attempts from every role.
- Google Cloud Vision and OpenAI use independent provider rows.
- A receipt is valid only when `granted = true` and `policy_version = 2`.
- The receipt and event history store server time, disclosure locale, policy version, and the displayed disclosure snapshot.
- Authenticated clients can read their own records but can mutate consent only through the server-owned recording function.
- Withdrawal is account-wide. Every provider-calling Edge Function checks the current receipt immediately before external transfer.
- Missing rows, stale versions, query errors, and withdrawn rows fail closed with `403 third_party_ai_consent_required`.
- If a grant request loses its response after the server may have committed it, the client treats the result as unknown, sends no data in that attempt, and permits only status recheck or confirmed withdrawal before closing the uncertain choice.

## Promotion order

The mobile 1.0.2 workflow promotes the database migration, Edge Functions, and app together. The safe order is:

1. Apply `20260731120950_create_third_party_ai_consents.sql`.
2. A required dependent workflow job deploys all eight provider-calling Edge Functions.
3. Only after that job succeeds, build and make the 1.0.2 client available so users can review and record consent.

Existing clients have no server receipt. After step 2 they receive `403 third_party_ai_consent_required`, no provider transfer occurs, and affected AI features remain unavailable until the user updates to 1.0.2 and grants the relevant consent. This privacy-safe degradation is intentional.

## Verification

- Grant one provider and confirm the other remains denied.
- Grant on one device and confirm another device sees the same account receipt.
- Withdraw on the second device and confirm both devices receive `403` without an upstream provider call.
- Change the required policy version in a test and confirm the old receipt is denied.
- Simulate a committed grant with a lost response and confirm the client distinguishes confirmed, denied, and unknown outcomes.
- Attempt to update and delete consent history with an elevated role and confirm the append-only trigger rejects both operations.
- Confirm cached recommendations render without a new provider call.
- Confirm a recommendation without consent shows the recovery card and does not open a consent sheet until the user taps its action.

## Rollback and hold

Do not restore the previous client-only gate. If the 1.0.2 client is delayed or rejected, keep the server boundary fail-closed and hold the AI features while a corrected client is prepared. A schema rollback must preserve receipt evidence and must not re-enable provider transfer without a current server receipt.

Public web privacy content, support FAQ, App Store Connect App Privacy, and real-device consent checks remain separate BOK-345 release gates. They must match this contract before App Review submission.

## Disclosure evidence

- Google Vision OCR regional endpoints: <https://docs.cloud.google.com/vision/docs/ocr>
- Google Vision data use: <https://docs.cloud.google.com/vision/docs/data-usage>
- Current Google contracting entity: <https://cloud.google.com/terms/google-entity>
- OpenAI API data controls and retention: <https://platform.openai.com/docs/models/default-usage-policies-by-endpoint>
- OpenAI Services Agreement and contracting party: <https://cdn.openai.com/osa/openai-services-agreement.pdf>
- OpenAI API subprocessors and processing locations: <https://openai.com/policies/sub-processor-list/>
