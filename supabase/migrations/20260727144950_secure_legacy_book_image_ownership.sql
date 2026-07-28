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

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.book_images
TO authenticated;

CREATE OR REPLACE FUNCTION public.backfill_book_image_legacy_ownership()
RETURNS bigint
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  WITH normalized_claims AS (
    SELECT
      user_id,
      public.book_image_storage_path(image_url) AS object_name
    FROM public.book_images
    WHERE image_url IS NOT NULL
      AND user_id IS NOT NULL
  ),
  trusted_legacy_objects AS (
    SELECT DISTINCT
      normalized_claims.object_name,
      normalized_claims.user_id
    FROM normalized_claims
    INNER JOIN storage.objects
      ON storage.objects.bucket_id = 'book-images'
      AND storage.objects.name = normalized_claims.object_name
      AND storage.objects.owner_id = normalized_claims.user_id::text
    WHERE NULLIF(BTRIM(normalized_claims.object_name), '') IS NOT NULL
  ),
  inserted_ownership AS (
    INSERT INTO public.book_image_legacy_ownership (
      bucket_id,
      object_name,
      user_id
    )
    SELECT 'book-images', object_name, user_id
    FROM trusted_legacy_objects
    ON CONFLICT (bucket_id, object_name) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::bigint
  FROM inserted_ownership
$$;

SELECT public.backfill_book_image_legacy_ownership();

REVOKE ALL
ON FUNCTION public.backfill_book_image_legacy_ownership()
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_owned_book_image_paths_for_deletion(
  target_user_id uuid
)
RETURNS TABLE (object_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT storage.objects.name
  FROM storage.objects
  WHERE storage.objects.bucket_id = 'book-images'
    AND storage.objects.owner_id = target_user_id::text
$$;

REVOKE ALL
ON FUNCTION public.list_owned_book_image_paths_for_deletion(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.list_owned_book_image_paths_for_deletion(uuid)
TO service_role;

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
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND storage.objects.owner_id = auth.uid()::text
    )
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
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND storage.objects.owner_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1
      FROM public.book_image_legacy_ownership
      WHERE bucket_id = storage.objects.bucket_id
        AND object_name = storage.objects.name
        AND user_id = auth.uid()
    )
  )
);
