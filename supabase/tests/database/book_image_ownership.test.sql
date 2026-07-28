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
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'book-image-owner-a@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'book-image-owner-b@example.com',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

INSERT INTO public.books (
  id,
  title,
  start_date,
  target_date,
  user_id
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Owner A Book',
    now(),
    now() + interval '7 days',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Owner B Book',
    now(),
    now() + interval '7 days',
    '22222222-2222-2222-2222-222222222222'
  );

INSERT INTO storage.objects (id, bucket_id, name, owner_id)
VALUES
  (
    'aaaaaaaa-1111-1111-1111-111111111111',
    'book-images',
    'legacy/owner-a.jpg',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'bbbbbbbb-2222-2222-2222-222222222222',
    'book-images',
    'legacy/owner-b.jpg',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'aaaaaaaa-3333-3333-3333-333333333333',
    'book-images',
    '11111111-1111-1111-1111-111111111111/owned.jpg',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'bbbbbbbb-4444-4444-4444-444444444444',
    'book-images',
    '11111111-1111-1111-1111-111111111111/foreign-owner.jpg',
    '22222222-2222-2222-2222-222222222222'
  );

INSERT INTO public.book_images (book_id, image_url, user_id)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'legacy/owner-a.jpg',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'legacy/owner-b.jpg',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'legacy/owner-b.jpg',
    '22222222-2222-2222-2222-222222222222'
  );

SELECT public.backfill_book_image_legacy_ownership();

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.book_image_legacy_ownership
    WHERE object_name = 'legacy/owner-a.jpg'
      AND user_id = '11111111-1111-1111-1111-111111111111'
  $$,
  ARRAY[1::bigint],
  'trusted storage owner is backfilled'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.book_image_legacy_ownership
    WHERE object_name = 'legacy/owner-b.jpg'
      AND user_id = '22222222-2222-2222-2222-222222222222'
  $$,
  ARRAY[1::bigint],
  'victim object remains mapped to its storage owner'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.book_image_legacy_ownership
    WHERE object_name = 'legacy/owner-b.jpg'
      AND user_id = '11111111-1111-1111-1111-111111111111'
  $$,
  ARRAY[0::bigint],
  'mutable metadata cannot claim another storage owner object'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
  '11111111-1111-1111-1111-111111111111';

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM storage.objects
    WHERE bucket_id = 'book-images'
      AND name = 'legacy/owner-a.jpg'
  $$,
  ARRAY[1::bigint],
  'authenticated owner can read a trusted legacy object'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM storage.objects
    WHERE bucket_id = 'book-images'
      AND name =
        '11111111-1111-1111-1111-111111111111/owned.jpg'
  $$,
  ARRAY[1::bigint],
  'authenticated owner can read an owned namespaced object'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM storage.objects
    WHERE bucket_id = 'book-images'
      AND name =
        '11111111-1111-1111-1111-111111111111/foreign-owner.jpg'
  $$,
  ARRAY[0::bigint],
  'path prefix cannot override the trusted storage owner'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM storage.objects
    WHERE bucket_id = 'book-images'
      AND name = 'legacy/owner-b.jpg'
  $$,
  ARRAY[0::bigint],
  'authenticated user cannot read another owner legacy object'
);

SELECT throws_ok(
  $$
    INSERT INTO public.book_images (book_id, image_url, user_id)
    VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-2222-2222-222222222222/forged.jpg',
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "book_images"',
  'authenticated user cannot insert a foreign-prefixed image path'
);

SELECT throws_ok(
  $$
    UPDATE public.book_images
    SET image_url =
      '22222222-2222-2222-2222-222222222222/forged.jpg'
    WHERE image_url = 'legacy/owner-a.jpg'
      AND user_id = '11111111-1111-1111-1111-111111111111'
  $$,
  '42501',
  'new row violates row-level security policy for table "book_images"',
  'authenticated user cannot update an image to a foreign-prefixed path'
);

SELECT throws_ok(
  $$
    INSERT INTO public.book_image_legacy_ownership (
      bucket_id,
      object_name,
      user_id
    )
    VALUES (
      'book-images',
      'legacy/forged.jpg',
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  '42501',
  'permission denied for table book_image_legacy_ownership',
  'authenticated user cannot mutate trusted legacy ownership'
);

SELECT throws_ok(
  $$
    SELECT *
    FROM public.list_owned_book_image_paths_for_deletion(
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  '42501',
  'permission denied for function list_owned_book_image_paths_for_deletion',
  'authenticated users cannot enumerate account cleanup targets'
);

RESET ROLE;

SELECT results_eq(
  $$
    SELECT object_name
    FROM public.list_owned_book_image_paths_for_deletion(
      '11111111-1111-1111-1111-111111111111'
    )
    ORDER BY object_name
  $$,
  ARRAY[
    '11111111-1111-1111-1111-111111111111/owned.jpg',
    'legacy/owner-a.jpg'
  ]::text[],
  'cleanup targets come only from current storage ownership'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.list_owned_book_image_paths_for_deletion(
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  ARRAY[2::bigint],
  'account cleanup selects all objects owned by the account'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.list_owned_book_image_paths_for_deletion(
      '11111111-1111-1111-1111-111111111111'
    )
    WHERE object_name =
        '11111111-1111-1111-1111-111111111111/foreign-owner.jpg'
  $$,
  ARRAY[0::bigint],
  'account cleanup excludes a foreign-owned object under the user prefix'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)
    FROM public.list_owned_book_image_paths_for_deletion(
      '11111111-1111-1111-1111-111111111111'
    )
    WHERE object_name = 'legacy/owner-b.jpg'
  $$,
  ARRAY[0::bigint],
  'account cleanup excludes another account legacy object'
);

SELECT * FROM finish();

ROLLBACK;
