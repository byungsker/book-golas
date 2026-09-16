-- Local-only fixture seed. Use through `npm run reset:fixtures`.
-- The .invalid addresses and fixed UUIDs are synthetic and must never be used remotely.

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DELETE FROM public.book_images
WHERE id IN (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202'
);
DELETE FROM public.books
WHERE id IN (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102'
);
DELETE FROM public.users
WHERE id IN (
  '00000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000042'
);
DELETE FROM auth.users
WHERE id IN (
  '00000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000042'
);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000041',
    'authenticated',
    'authenticated',
    'fixture-user-a@local.invalid',
    crypt('local-fixture-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"fixture_key":"user_a"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000042',
    'authenticated',
    'authenticated',
    'fixture-user-b@local.invalid',
    crypt('local-fixture-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"fixture_key":"user_b"}'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.users (id, email, nickname, name, metadata)
VALUES
  (
    '00000000-0000-4000-8000-000000000041',
    'fixture-user-a@local.invalid',
    'Fixture User A',
    'Fixture User A',
    '{"fixture_key":"user_a"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000042',
    'fixture-user-b@local.invalid',
    'Fixture User B',
    'Fixture User B',
    '{"fixture_key":"user_b"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nickname = EXCLUDED.nickname,
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata;

INSERT INTO public.books (
  id,
  title,
  author,
  start_date,
  target_date,
  image_url,
  current_page,
  total_pages,
  user_id,
  status,
  attempt_count
)
VALUES
  (
    '00000000-0000-4000-8000-000000000101',
    'Fixture Book A',
    'Fixture Author A',
    '2026-01-01T00:00:00Z',
    '2026-01-31T00:00:00Z',
    NULL,
    12,
    240,
    '00000000-0000-4000-8000-000000000041',
    'reading',
    1
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'Fixture Book B',
    'Fixture Author B',
    '2026-02-01T00:00:00Z',
    '2026-02-28T00:00:00Z',
    NULL,
    24,
    320,
    '00000000-0000-4000-8000-000000000042',
    'planned',
    1
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  start_date = EXCLUDED.start_date,
  target_date = EXCLUDED.target_date,
  image_url = EXCLUDED.image_url,
  current_page = EXCLUDED.current_page,
  total_pages = EXCLUDED.total_pages,
  user_id = EXCLUDED.user_id,
  status = EXCLUDED.status,
  attempt_count = EXCLUDED.attempt_count;

INSERT INTO public.book_images (
  id,
  book_id,
  image_url,
  caption,
  user_id,
  page_number,
  storage_bucket,
  storage_path,
  mime_type,
  byte_size,
  ocr_status,
  ocr_error
)
VALUES
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    NULL,
    'Fixture image A',
    '00000000-0000-4000-8000-000000000041',
    1,
    'book-images',
    '00000000-0000-4000-8000-000000000041/00000000-0000-4000-8000-000000000101/book-a.png',
    'image/png',
    68,
    'not_requested',
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000102',
    NULL,
    'Fixture image B',
    '00000000-0000-4000-8000-000000000042',
    1,
    'book-images',
    '00000000-0000-4000-8000-000000000042/00000000-0000-4000-8000-000000000102/book-b.png',
    'image/png',
    68,
    'not_requested',
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  image_url = EXCLUDED.image_url,
  caption = EXCLUDED.caption,
  user_id = EXCLUDED.user_id,
  page_number = EXCLUDED.page_number,
  storage_bucket = EXCLUDED.storage_bucket,
  storage_path = EXCLUDED.storage_path,
  mime_type = EXCLUDED.mime_type,
  byte_size = EXCLUDED.byte_size,
  ocr_status = EXCLUDED.ocr_status,
  ocr_error = EXCLUDED.ocr_error;
