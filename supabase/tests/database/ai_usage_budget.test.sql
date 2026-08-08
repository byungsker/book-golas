BEGIN;

SELECT plan(15);

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
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'ai-budget-a@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '66666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'ai-budget-b@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
  '55555555-5555-5555-5555-555555555555';

SELECT ok(
  (public.consume_ai_usage(10)->>'allowed')::boolean,
  'authenticated user can consume an AI budget unit'
);

SELECT results_eq(
  $$
    SELECT (public.consume_ai_usage(20001)->>'reason')
  $$,
  ARRAY['input_too_large'::text],
  'oversized input is rejected before usage is recorded'
);

SELECT ok(
  position('FOR UPDATE' IN pg_get_functiondef('public.consume_ai_usage(integer)'::regprocedure)) > 0,
  'budget function locks the user bucket for concurrent calls'
);

SELECT results_eq(
  $$
    SELECT (public.consume_ai_usage(10)->>'allowed')
  $$,
  ARRAY['true'::text],
  'a second in-flight budget call remains within the concurrency cap'
);
SELECT results_eq(
  $$
    SELECT (public.consume_ai_usage(10)->>'allowed')
  $$,
  ARRAY['true'::text],
  'a third in-flight budget call remains within the concurrency cap'
);
SELECT results_eq(
  $$
    SELECT public.consume_ai_usage(10)->>'reason'
  $$,
  ARRAY['concurrency_exceeded'::text],
  'the fourth in-flight budget call is rejected'
);

RESET ROLE;

SELECT ok(
  (SELECT COUNT(*) = 3
   FROM public.ai_usage_leases
   WHERE user_id = '55555555-5555-5555-5555-555555555555'),
  'the user bucket tracks the active lease count'
);

DELETE FROM public.ai_usage_leases
WHERE user_id = '55555555-5555-5555-5555-555555555555';

SELECT results_eq(
  $$
    SELECT request_count
    FROM public.ai_usage_buckets
    WHERE user_id = '55555555-5555-5555-5555-555555555555'
  $$,
  ARRAY[3],
  'rejected input does not increment the request count'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
  '66666666-6666-6666-6666-666666666666';

SELECT ok(
  (public.consume_ai_usage(10)->>'allowed')::boolean,
  'a second authenticated user receives an independent budget'
);

RESET ROLE;

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.ai_usage_buckets
    WHERE user_id = '55555555-5555-5555-5555-555555555555'
  $$,
  ARRAY[1::bigint],
  'user A has one isolated usage bucket'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.ai_usage_buckets
    WHERE user_id = '66666666-6666-6666-6666-666666666666'
  $$,
  ARRAY[1::bigint],
  'user B has one isolated usage bucket'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
  '55555555-5555-5555-5555-555555555555';

DO $$
DECLARE
  attempt INTEGER;
  result JSONB;
BEGIN
  FOR attempt IN 1..27 LOOP
    result := public.consume_ai_usage(10);
    IF NOT (result->>'allowed')::boolean THEN
      RAISE EXCEPTION 'unexpected quota rejection at attempt %', attempt;
    END IF;
  END LOOP;
END
$$;

SELECT ok(
  NOT (public.consume_ai_usage(10)->>'allowed')::boolean,
  'the 31st daily request is rejected'
);

SELECT results_eq(
  $$
    SELECT request_count
    FROM public.ai_usage_buckets
    WHERE user_id = '55555555-5555-5555-5555-555555555555'
  $$,
  ARRAY[30],
  'quota rejection does not increment the bucket'
);

SELECT throws_ok(
  $$ SELECT * FROM public.ai_usage_buckets $$,
  '42501',
  'permission denied for table ai_usage_buckets',
  'authenticated clients cannot read usage buckets directly'
);

RESET ROLE;
SET LOCAL request.jwt.claim.sub = '';

SELECT throws_ok(
  $$ SELECT public.consume_ai_usage(1) $$,
  '42501',
  'authentication required',
  'unauthenticated callers are rejected by the server-owned function'
);

SELECT * FROM finish();
ROLLBACK;
