CREATE OR REPLACE FUNCTION public.book_image_storage_path(stored_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN NULLIF(BTRIM(stored_value), '') IS NULL THEN NULL
    WHEN POSITION('/storage/v1/object/public/book-images/' IN stored_value) > 0
      THEN SPLIT_PART(
        SPLIT_PART(
          stored_value,
          '/storage/v1/object/public/book-images/',
          2
        ),
        '?',
        1
      )
    WHEN POSITION('/storage/v1/object/sign/book-images/' IN stored_value) > 0
      THEN SPLIT_PART(
        SPLIT_PART(
          stored_value,
          '/storage/v1/object/sign/book-images/',
          2
        ),
        '?',
        1
      )
    WHEN POSITION(
      '/storage/v1/object/authenticated/book-images/' IN stored_value
    ) > 0
      THEN SPLIT_PART(
        SPLIT_PART(
          stored_value,
          '/storage/v1/object/authenticated/book-images/',
          2
        ),
        '?',
        1
      )
    WHEN stored_value ~* '^https?://' THEN NULL
    ELSE LTRIM(SPLIT_PART(stored_value, '?', 1), '/')
  END
$$;

CREATE TABLE public.book_image_legacy_ownership (
  bucket_id text NOT NULL DEFAULT 'book-images',
  object_name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_id, object_name),
  CONSTRAINT book_image_legacy_ownership_bucket_check
    CHECK (bucket_id = 'book-images')
);

CREATE INDEX IF NOT EXISTS book_images_user_id_idx
ON public.book_images (user_id);

WITH legacy_candidates AS (
  SELECT
    user_id,
    public.book_image_storage_path(image_url) AS object_name
  FROM public.book_images
  WHERE image_url IS NOT NULL
),
unambiguous_legacy_objects AS (
  SELECT
    object_name,
    MIN(user_id::text)::uuid AS user_id
  FROM legacy_candidates
  WHERE NULLIF(BTRIM(object_name), '') IS NOT NULL
    AND (
      POSITION('/' IN object_name) = 0
      OR SPLIT_PART(object_name, '/', 1) !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR SPLIT_PART(object_name, '/', 1) = user_id::text
    )
  GROUP BY object_name
  HAVING COUNT(DISTINCT user_id) = 1
)
INSERT INTO public.book_image_legacy_ownership (
  bucket_id,
  object_name,
  user_id
)
SELECT 'book-images', object_name, user_id
FROM unambiguous_legacy_objects;

ALTER TABLE public.book_image_legacy_ownership ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.book_image_legacy_ownership FROM anon, authenticated;
GRANT SELECT ON public.book_image_legacy_ownership TO authenticated;

CREATE POLICY "Users can view their own legacy book image ownership"
ON public.book_image_legacy_ownership
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own book images"
ON public.book_images;
DROP POLICY IF EXISTS "Users can update their own book images"
ON public.book_images;

CREATE POLICY "Users can insert their own book images"
ON public.book_images
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    image_url IS NULL
    OR SPLIT_PART(public.book_image_storage_path(image_url), '/', 1)
      = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.book_image_legacy_ownership
      WHERE bucket_id = 'book-images'
        AND object_name = public.book_image_storage_path(image_url)
        AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own book images"
ON public.book_images
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND (
    image_url IS NULL
    OR SPLIT_PART(public.book_image_storage_path(image_url), '/', 1)
      = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.book_image_legacy_ownership
      WHERE bucket_id = 'book-images'
        AND object_name = public.book_image_storage_path(image_url)
        AND user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can read their own book image objects"
ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own book image objects"
ON storage.objects;

CREATE POLICY "Users can read their own book image objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'book-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.book_image_legacy_ownership
      WHERE bucket_id = storage.objects.bucket_id
        AND object_name = storage.objects.name
        AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own book image objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'book-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.book_image_legacy_ownership
      WHERE bucket_id = storage.objects.bucket_id
        AND object_name = storage.objects.name
        AND user_id = auth.uid()
    )
  )
);
