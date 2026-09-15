ALTER TABLE public.book_images
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'book-images',
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS byte_size bigint,
  ADD COLUMN IF NOT EXISTS ocr_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS ocr_error text,
  ADD COLUMN IF NOT EXISTS ocr_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS request_idempotency_key uuid;

UPDATE public.book_images
SET storage_path = substring(image_url FROM '/book-images/(.+)$')
WHERE storage_path IS NULL
  AND image_url IS NOT NULL
  AND image_url ~ '/book-images/';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.book_images'::regclass
      AND conname = 'book_images_storage_bucket_check'
  ) THEN
    ALTER TABLE public.book_images
      ADD CONSTRAINT book_images_storage_bucket_check
      CHECK (storage_bucket = 'book-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.book_images'::regclass
      AND conname = 'book_images_byte_size_check'
  ) THEN
    ALTER TABLE public.book_images
      ADD CONSTRAINT book_images_byte_size_check
      CHECK (byte_size IS NULL OR (byte_size > 0 AND byte_size <= 8388608));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.book_images'::regclass
      AND conname = 'book_images_ocr_status_check'
  ) THEN
    ALTER TABLE public.book_images
      ADD CONSTRAINT book_images_ocr_status_check
      CHECK (ocr_status IN ('not_requested', 'pending', 'ready', 'failed', 'manual'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS book_images_request_idempotency_idx
  ON public.book_images(user_id, book_id, request_idempotency_key)
  WHERE request_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS book_images_storage_path_idx
  ON public.book_images(storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

UPDATE storage.buckets
SET public = false
WHERE id = 'book-images';

DROP POLICY IF EXISTS "Authenticated users can read own private book images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own private book images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own private book images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own private book images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own book image objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own book image objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own book image objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own book image objects" ON storage.objects;

CREATE POLICY "Authenticated users can read own private book images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'book-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated users can upload own private book images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'book-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated users can update own private book images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'book-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'book-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated users can delete own private book images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'book-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
