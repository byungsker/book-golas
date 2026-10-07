UPDATE storage.buckets
SET public = false
WHERE id = 'book-images';

DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

CREATE POLICY "Users can read their own book image objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'book-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.book_images
      WHERE book_images.user_id = auth.uid()
        AND (
          book_images.image_url = storage.objects.name
          OR book_images.image_url LIKE '%/storage/v1/object/public/book-images/' || storage.objects.name
          OR book_images.image_url LIKE '%/storage/v1/object/sign/book-images/' || storage.objects.name || '%'
          OR book_images.image_url LIKE '%/storage/v1/object/authenticated/book-images/' || storage.objects.name || '%'
        )
    )
  )
);

CREATE POLICY "Users can upload their own book image objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Users can update their own book image objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'book-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'book-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Users can delete their own book image objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'book-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.book_images
      WHERE book_images.user_id = auth.uid()
        AND (
          book_images.image_url = storage.objects.name
          OR book_images.image_url LIKE '%/storage/v1/object/public/book-images/' || storage.objects.name
          OR book_images.image_url LIKE '%/storage/v1/object/sign/book-images/' || storage.objects.name || '%'
          OR book_images.image_url LIKE '%/storage/v1/object/authenticated/book-images/' || storage.objects.name || '%'
        )
    )
  )
);
