-- Consumer-owned notes, highlights and memorable-page records.
-- The record is durable before the optional AI indexing side effect runs.
CREATE TABLE IF NOT EXISTS public.consumer_reading_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('note', 'highlight', 'memorable_page')),
  page_number integer CHECK (page_number IS NULL OR page_number >= 1),
  content_text text NOT NULL DEFAULT '',
  caption text,
  image_url text,
  rectangles jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_id uuid,
  source_href text,
  index_status text NOT NULL DEFAULT 'skipped'
    CHECK (index_status IN ('pending', 'ready', 'failed', 'skipped')),
  index_error text,
  last_index_idempotency_key uuid,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consumer_reading_records_unique_request UNIQUE (user_id, book_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_consumer_reading_records_owner_book
  ON public.consumer_reading_records(user_id, book_id, created_at DESC);

ALTER TABLE public.consumer_reading_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.consumer_reading_records FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumer_reading_records TO authenticated;

DROP POLICY IF EXISTS "Users can view own consumer reading records" ON public.consumer_reading_records;
DROP POLICY IF EXISTS "Users can insert own consumer reading records" ON public.consumer_reading_records;
DROP POLICY IF EXISTS "Users can update own consumer reading records" ON public.consumer_reading_records;
DROP POLICY IF EXISTS "Users can delete own consumer reading records" ON public.consumer_reading_records;

CREATE POLICY "Users can view own consumer reading records"
  ON public.consumer_reading_records FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.books AS parent_book
      WHERE parent_book.id = consumer_reading_records.book_id
        AND parent_book.user_id = auth.uid()
        AND parent_book.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can insert own consumer reading records"
  ON public.consumer_reading_records FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.books AS parent_book
      WHERE parent_book.id = consumer_reading_records.book_id
        AND parent_book.user_id = auth.uid()
        AND parent_book.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update own consumer reading records"
  ON public.consumer_reading_records FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.books AS parent_book
      WHERE parent_book.id = consumer_reading_records.book_id
        AND parent_book.user_id = auth.uid()
        AND parent_book.deleted_at IS NULL
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.books AS parent_book
      WHERE parent_book.id = consumer_reading_records.book_id
        AND parent_book.user_id = auth.uid()
        AND parent_book.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can delete own consumer reading records"
  ON public.consumer_reading_records FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.books AS parent_book
      WHERE parent_book.id = consumer_reading_records.book_id
        AND parent_book.user_id = auth.uid()
        AND parent_book.deleted_at IS NULL
    )
  );

COMMENT ON TABLE public.consumer_reading_records IS 'User-owned Web records; indexing is an independent, retryable side effect.';
COMMENT ON COLUMN public.consumer_reading_records.rectangles IS 'Normalized highlight rectangles with x, y, width and height in the 0..1 range.';
