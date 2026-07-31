BEGIN;

SELECT plan(18);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'ai-consent-a@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'ai-consent-b@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
  '33333333-3333-3333-3333-333333333333';

SELECT ok(
  public.record_third_party_ai_consent(
    'open_ai',
    1,
    true,
    'ko-KR',
    '{"title":"v1"}'::jsonb
  ),
  'user can record a grant through the server-owned function'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.third_party_ai_consents
    WHERE user_id = '33333333-3333-3333-3333-333333333333'
      AND provider = 'open_ai'
      AND granted
  $$,
  ARRAY[1::bigint],
  'user can read the current receipt'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.third_party_ai_consent_events
    WHERE user_id = '33333333-3333-3333-3333-333333333333'
      AND provider = 'open_ai'
  $$,
  ARRAY[1::bigint],
  'grant creates an immutable audit event'
);

SELECT throws_ok(
  $$
    UPDATE public.third_party_ai_consents
    SET granted = false
    WHERE user_id = '33333333-3333-3333-3333-333333333333'
  $$,
  '42501',
  'permission denied for table third_party_ai_consents',
  'authenticated clients cannot overwrite current receipts'
);

SELECT throws_ok(
  $$
    INSERT INTO public.third_party_ai_consent_events (
      user_id,
      provider,
      policy_version,
      disclosure_locale,
      disclosure_snapshot,
      granted
    ) VALUES (
      '33333333-3333-3333-3333-333333333333',
      'open_ai',
      1,
      'ko-KR',
      '{}'::jsonb,
      false
    )
  $$,
  '42501',
  'permission denied for table third_party_ai_consent_events',
  'authenticated clients cannot forge audit events'
);

SET LOCAL request.jwt.claim.sub =
  '44444444-4444-4444-4444-444444444444';

SELECT results_eq(
  $$
    SELECT COUNT(*) FROM public.third_party_ai_consents
  $$,
  ARRAY[0::bigint],
  'another account cannot read the current receipt'
);

SELECT results_eq(
  $$
    SELECT COUNT(*) FROM public.third_party_ai_consent_events
  $$,
  ARRAY[0::bigint],
  'another account cannot read consent history'
);

SELECT ok(
  public.record_third_party_ai_consent(
    'google_cloud_vision',
    1,
    true,
    'en-US',
    '{"title":"vision"}'::jsonb
  ),
  'another account can record only its own consent'
);

SELECT results_eq(
  $$
    SELECT COUNT(*) FROM public.third_party_ai_consents
  $$,
  ARRAY[1::bigint],
  'another account sees only its own receipt'
);

SET LOCAL request.jwt.claim.sub =
  '33333333-3333-3333-3333-333333333333';

SELECT ok(
  public.record_third_party_ai_consent(
    'open_ai',
    2,
    true,
    'ko-KR',
    '{"title":"v2"}'::jsonb
  ),
  'reconsent records a new policy version'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.third_party_ai_consent_events
    WHERE provider = 'open_ai'
  $$,
  ARRAY[2::bigint],
  'reconsent preserves the previous evidence event'
);

SELECT ok(
  public.record_third_party_ai_consent(
    'open_ai',
    99,
    false
  ),
  'withdrawal is recorded by the server-owned function'
);

SELECT results_eq(
  $$
    SELECT granted
    FROM public.third_party_ai_consents
    WHERE provider = 'open_ai'
  $$,
  ARRAY[false],
  'current receipt is denied after withdrawal'
);

SELECT results_eq(
  $$
    SELECT policy_version
    FROM public.third_party_ai_consent_events
    WHERE provider = 'open_ai'
    ORDER BY created_at DESC
    LIMIT 1
  $$,
  ARRAY[2],
  'withdrawal retains the policy version of the accepted disclosure'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT throws_ok(
  $$
    UPDATE public.third_party_ai_consent_events
    SET disclosure_snapshot = '{}'::jsonb
    WHERE provider = 'open_ai'
  $$,
  '42501',
  'permission denied for table third_party_ai_consent_events',
  'service role lacks permission to update consent history'
);

SELECT throws_ok(
  $$
    DELETE FROM public.third_party_ai_consent_events
    WHERE provider = 'open_ai'
  $$,
  '42501',
  'permission denied for table third_party_ai_consent_events',
  'service role lacks permission to delete consent history'
);

RESET ROLE;

SELECT throws_ok(
  $$
    UPDATE public.third_party_ai_consent_events
    SET disclosure_snapshot = '{}'::jsonb
    WHERE provider = 'open_ai'
  $$,
  '55000',
  'Third-party AI consent events are append-only',
  'table owner cannot update consent history'
);

SELECT throws_ok(
  $$
    DELETE FROM public.third_party_ai_consent_events
    WHERE provider = 'open_ai'
  $$,
  '55000',
  'Third-party AI consent events are append-only',
  'table owner cannot delete consent history'
);

SELECT * FROM finish();

ROLLBACK;
