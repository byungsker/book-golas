INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'account-avatars',
  'account-avatars',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can read own private avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own private avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own private avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own private avatars" ON storage.objects;

CREATE POLICY "Authenticated users can read own private avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'account-avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated users can upload own private avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'account-avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated users can update own private avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'account-avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'account-avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated users can delete own private avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'account-avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
