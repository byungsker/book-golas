BEGIN;

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

DO $$
DECLARE
  error_state text;
  error_message text;
BEGIN
  BEGIN
    PERFORM public.reserve_ai_usage(
      'db-test.reservation',
      'open_ai',
      'gpt-4o-mini',
      'db-test-v1',
      10,
      3,
      100,
      0.00006045
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      error_state = RETURNED_SQLSTATE,
      error_message = MESSAGE_TEXT;
  END;

  IF error_state IS DISTINCT FROM '42501' OR error_message IS DISTINCT FROM 'authentication required' THEN
    RAISE EXCEPTION 'unauthenticated reservation assertion failed: state=%, message=%', error_state, error_message;
  END IF;
END
$$;

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

DO $$
DECLARE
  reservation jsonb;
  released boolean;
BEGIN
  SELECT result INTO reservation
  FROM ai_cost_control_test_reservations
  WHERE label = 'owner-release';
  IF (reservation->>'allowed')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'authenticated reservation assertion failed: %', reservation;
  END IF;
  IF reservation->>'policyVersion' IS DISTINCT FROM 'cost-control-v1' THEN
    RAISE EXCEPTION 'effective policy version assertion failed: %', reservation;
  END IF;

  SELECT public.release_ai_usage(lease_id) INTO released
  FROM ai_cost_control_test_reservations
  WHERE label = 'owner-release';
  IF released IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'owner release assertion failed';
  END IF;
END
$$;

RESET ROLE;

DO $$
DECLARE
  lease_count bigint;
BEGIN
  SELECT COUNT(*) INTO lease_count
  FROM public.ai_usage_leases
  WHERE id = (SELECT lease_id FROM ai_cost_control_test_reservations WHERE label = 'owner-release');
  IF lease_count <> 0 THEN
    RAISE EXCEPTION 'owner release left a lease behind: %', lease_count;
  END IF;
END
$$;

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

DO $$
DECLARE
  reservation jsonb;
BEGIN
  SELECT result INTO reservation
  FROM ai_cost_control_test_reservations
  WHERE label = 'cross-user-release';
  IF (reservation->>'allowed')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'cross-user fixture reservation assertion failed: %', reservation;
  END IF;
END
$$;

SET LOCAL request.jwt.claim.sub =
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

DO $$
DECLARE
  released boolean;
BEGIN
  SELECT public.release_ai_usage(lease_id) INTO released
  FROM ai_cost_control_test_reservations
  WHERE label = 'cross-user-release';
  IF released IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'cross-user release assertion failed: %', released;
  END IF;
END
$$;

RESET ROLE;

DO $$
DECLARE
  lease_count bigint;
BEGIN
  SELECT COUNT(*) INTO lease_count
  FROM public.ai_usage_leases
  WHERE id = (SELECT lease_id FROM ai_cost_control_test_reservations WHERE label = 'cross-user-release');
  IF lease_count <> 1 THEN
    RAISE EXCEPTION 'cross-user release removed the owner lease: %', lease_count;
  END IF;
END
$$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  rls_enabled boolean;
  error_state text;
  error_message text;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE oid = 'public.ai_usage_control_events'::regclass;
  IF rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'control event RLS assertion failed';
  END IF;

  BEGIN
    PERFORM 1 FROM public.ai_usage_control_events;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      error_state = RETURNED_SQLSTATE,
      error_message = MESSAGE_TEXT;
  END;
  IF error_state IS DISTINCT FROM '42501' OR error_message IS DISTINCT FROM 'permission denied for table ai_usage_control_events' THEN
    RAISE EXCEPTION 'direct control event access assertion failed: state=%, message=%', error_state, error_message;
  END IF;
END
$$;

RESET ROLE;

SELECT 'ai cost-control database contract passed' AS result;
ROLLBACK;
