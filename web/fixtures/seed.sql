INSERT INTO public.users (id, email, nickname, name, metadata, revenuecat_user_id)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'fixture-user-a', 'Fixture A', 'Fixture A', '{"fixture":true,"owner":"userA"}', '11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222', 'fixture-user-b', 'Fixture B', 'Fixture B', '{"fixture":true,"owner":"userB"}', '22222222-2222-4222-8222-222222222222')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nickname = EXCLUDED.nickname,
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata,
  revenuecat_user_id = EXCLUDED.revenuecat_user_id;

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
  attempt_count,
  genre,
  publisher,
  isbn
)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Fixture Book A', 'Fixture Author A', '2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z', 'fixture://book-a', 12, 120, '11111111-1111-4111-8111-111111111111', 'reading', 1, 'fixture', 'Fixture Press', 'fixture-a'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Fixture Book B', 'Fixture Author B', '2026-02-01T00:00:00Z', '2026-02-28T00:00:00Z', 'fixture://book-b', 24, 240, '22222222-2222-4222-8222-222222222222', 'planned', 1, 'fixture', 'Fixture Press', 'fixture-b')
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
  attempt_count = EXCLUDED.attempt_count,
  genre = EXCLUDED.genre,
  publisher = EXCLUDED.publisher,
  isbn = EXCLUDED.isbn;

INSERT INTO public.book_images (
  id,
  book_id,
  image_url,
  caption,
  user_id,
  extracted_text,
  page_number,
  highlights
)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fixture://image-a', 'Fixture image A', '11111111-1111-4111-8111-111111111111', 'Fixture text A', 12, '[]'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'fixture://image-b', 'Fixture image B', '22222222-2222-4222-8222-222222222222', 'Fixture text B', 24, '[]')
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  image_url = EXCLUDED.image_url,
  caption = EXCLUDED.caption,
  user_id = EXCLUDED.user_id,
  extracted_text = EXCLUDED.extracted_text,
  page_number = EXCLUDED.page_number,
  highlights = EXCLUDED.highlights;
