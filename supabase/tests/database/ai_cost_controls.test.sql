BEGIN;

SELECT plan(10);

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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'ai-cost-control-a@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'ai-cost-control-b@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

CREATE TEMP TABLE ai_cost_control_test_reservations (
  label text primary key,
  result jsonb not null,
  lease_id uuid
);
GRANT SELECT, INSERT ON ai_cost_control_test_reservations TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '';

SELECT throws_ok(
  $$
    SELECT public.reserve_ai_usage(
      'db-test.reservation',
      'open_ai',
      'gpt-4o-mini',
      'db-test-v1',
      10,
      3,
      100,
      0.00006045
    )
  $$,
  '42501',
  'authentication required',
  'unauthenticated reservation calls are rejected'
);

SET LOCAL request.jwt.claim.sub =
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

INSERT INTO ai_cost_control_test_reservations (label, result, lease_id)
SELECT
  'owner-release',
  result,
  (result->>'leaseId')::uuid
FROM (
  SELECT public.reserve_ai_usage(
    'db-test.reservation',
    'open_ai',
    'gpt-4o-mini',
    'db-test-v1',
    10,
    3,
    100,
    0.00006045
  ) AS result
) reservation;

SELECT ok(
  (SELECT (result->>'allowed')::boolean FROM ai_cost_control_test_reservations WHERE label = 'owner-release'),
  'authenticated callers can reserve through the SECURITY DEFINER function'
);

SELECT results_eq(
  $$
    SELECT result->>'policyVersion'
    FROM ai_cost_control_test_reservations
    WHERE label = 'owner-release'
  $$,
  ARRAY['cost-control-v1'::text],
  'reservation returns the effective policy version'
);

SELECT ok(
  public.release_ai_usage(
    (SELECT lease_id FROM ai_cost_control_test_reservations WHERE label = 'owner-release')
  ),
  'the owning authenticated caller can release its lease'
);

RESET ROLE;

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.ai_usage_leases
    WHERE id = (SELECT lease_id FROM ai_cost_control_test_reservations WHERE label = 'owner-release')
  $$,
  ARRAY[0::bigint],
  'owner release removes the lease'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

INSERT INTO ai_cost_control_test_reservations (label, result, lease_id)
SELECT
  'cross-user-release',
  result,
  (result->>'leaseId')::uuid
FROM (
  SELECT public.reserve_ai_usage(
    'db-test.reservation',
    'open_ai',
    'gpt-4o-mini',
    'db-test-v1',
    10,
    3,
    100,
    0.00006045
  ) AS result
) reservation;

SELECT ok(
  (SELECT (result->>'allowed')::boolean FROM ai_cost_control_test_reservations WHERE label = 'cross-user-release'),
  'authenticated callers can create the cross-user release fixture'
);

SET LOCAL request.jwt.claim.sub =
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT ok(
  NOT public.release_ai_usage(
    (SELECT lease_id FROM ai_cost_control_test_reservations WHERE label = 'cross-user-release')
  ),
  'a different authenticated user cannot release the lease'
);

RESET ROLE;

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.ai_usage_leases
    WHERE id = (SELECT lease_id FROM ai_cost_control_test_reservations WHERE label = 'cross-user-release')
  $$,
  ARRAY[1::bigint],
  'cross-user release leaves the owner lease intact'
);

SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$
    SELECT relrowsecurity::text
    FROM pg_class
    WHERE oid = 'public.ai_usage_control_events'::regclass
  $$,
  ARRAY['true'::text],
  'control events keep row level security enabled'
);

SELECT throws_ok(
  $$ SELECT * FROM public.ai_usage_control_events $$,
  '42501',
  'permission denied for table ai_usage_control_events',
  'authenticated clients cannot read control events directly'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
