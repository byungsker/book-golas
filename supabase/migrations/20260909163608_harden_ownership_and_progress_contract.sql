UPDATE public.books
SET
  current_page = COALESCE(current_page, 0),
  total_pages = COALESCE(total_pages, 0),
  status = CASE
    WHEN status IS NULL OR btrim(status) = '' THEN 'reading'
    WHEN status IN ('abandoned', 'paused', 'dropped', 'on_hold') THEN 'will_retry'
    WHEN status IN ('finished', 'complete', 'done') THEN 'completed'
    WHEN status IN ('not_started', 'queued') THEN 'planned'
    WHEN status IN ('in_progress', 'active') THEN 'reading'
    ELSE status
  END
WHERE current_page IS NULL
   OR total_pages IS NULL
   OR status IS NULL
   OR btrim(status) = ''
   OR status NOT IN ('planned', 'reading', 'completed', 'will_retry');

DO $$
DECLARE
  unsupported_statuses text;
BEGIN
  SELECT string_agg(DISTINCT status, ', ' ORDER BY status)
  INTO unsupported_statuses
  FROM public.books
  WHERE status NOT IN ('planned', 'reading', 'completed', 'will_retry');

  IF unsupported_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'unsupported legacy book statuses: %', unsupported_statuses;
  END IF;
END;
$$;

ALTER TABLE public.books
  ALTER COLUMN current_page SET DEFAULT 0,
  ALTER COLUMN current_page SET NOT NULL,
  ALTER COLUMN total_pages SET DEFAULT 0,
  ALTER COLUMN total_pages SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'reading',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.books
  DROP CONSTRAINT IF EXISTS books_current_page_nonnegative,
  DROP CONSTRAINT IF EXISTS books_total_pages_nonnegative,
  DROP CONSTRAINT IF EXISTS books_status_check;

ALTER TABLE public.books
  ADD CONSTRAINT books_current_page_nonnegative
    CHECK (current_page >= 0),
  ADD CONSTRAINT books_total_pages_nonnegative
    CHECK (total_pages >= 0),
  ADD CONSTRAINT books_status_check
    CHECK (status IN ('planned', 'reading', 'completed', 'will_retry'));

REVOKE ALL PRIVILEGES
ON TABLE
  public.books,
  public.book_images,
  public.reading_progress_history,
  public.reading_sessions
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.books, public.book_images
TO authenticated;
GRANT SELECT, INSERT
ON public.reading_progress_history
TO authenticated;
REVOKE UPDATE, DELETE
ON public.reading_progress_history
FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
ON public.reading_sessions
TO authenticated;

DROP POLICY IF EXISTS "Users can view their own books" ON public.books;
DROP POLICY IF EXISTS "Users can insert their own books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
DROP POLICY IF EXISTS "Users can delete their own books" ON public.books;
DROP POLICY IF EXISTS "Users can view their own active books" ON public.books;
DROP POLICY IF EXISTS "Users can insert their own active books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own active books" ON public.books;

CREATE POLICY "Users can view their own active books"
ON public.books
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own active books"
ON public.books
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update their own active books"
ON public.books
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
ON public.books
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own book images" ON public.book_images;
DROP POLICY IF EXISTS "Users can insert their own book images" ON public.book_images;
DROP POLICY IF EXISTS "Users can update their own book images" ON public.book_images;
DROP POLICY IF EXISTS "Users can delete their own book images" ON public.book_images;
DROP POLICY IF EXISTS "Users can view images for their own active books" ON public.book_images;
DROP POLICY IF EXISTS "Users can insert images for their own active books" ON public.book_images;
DROP POLICY IF EXISTS "Users can update images for their own active books" ON public.book_images;
DROP POLICY IF EXISTS "Users can delete images for their own active books" ON public.book_images;

CREATE POLICY "Users can view images for their own active books"
ON public.book_images
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = book_images.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can insert images for their own active books"
ON public.book_images
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = book_images.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can update images for their own active books"
ON public.book_images
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = book_images.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = book_images.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can delete images for their own active books"
ON public.book_images
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = book_images.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Users can view their own progress" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can view progress for their own active books" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can insert progress for their own active books" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can update progress for their own active books" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can delete progress for their own active books" ON public.reading_progress_history;

ALTER TABLE public.reading_progress_history
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE POLICY "Users can view progress for their own active books"
ON public.reading_progress_history
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_progress_history.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can insert progress for their own active books"
ON public.reading_progress_history
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND idempotency_key IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_progress_history.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can update progress for their own active books"
ON public.reading_progress_history
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_progress_history.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_progress_history.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can delete progress for their own active books"
ON public.reading_progress_history
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_progress_history.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Users can view own reading sessions" ON public.reading_sessions;
DROP POLICY IF EXISTS "Users can insert own reading sessions" ON public.reading_sessions;
DROP POLICY IF EXISTS "Users can update own reading sessions" ON public.reading_sessions;
DROP POLICY IF EXISTS "Users can delete own reading sessions" ON public.reading_sessions;
DROP POLICY IF EXISTS "Users can view sessions for their own active books" ON public.reading_sessions;
DROP POLICY IF EXISTS "Users can insert sessions for their own active books" ON public.reading_sessions;
DROP POLICY IF EXISTS "Users can update sessions for their own active books" ON public.reading_sessions;
DROP POLICY IF EXISTS "Users can delete sessions for their own active books" ON public.reading_sessions;

CREATE POLICY "Users can view sessions for their own active books"
ON public.reading_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_sessions.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can insert sessions for their own active books"
ON public.reading_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_sessions.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can update sessions for their own active books"
ON public.reading_sessions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_sessions.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_sessions.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE POLICY "Users can delete sessions for their own active books"
ON public.reading_sessions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.books AS parent_book
    WHERE parent_book.id = reading_sessions.book_id
      AND parent_book.user_id = auth.uid()
      AND parent_book.deleted_at IS NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS reading_progress_history_user_idempotency_key_idx
ON public.reading_progress_history (user_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.reading_progress_requests (
  user_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  expected_current_page integer NOT NULL CHECK (expected_current_page >= 0),
  requested_current_page integer NOT NULL CHECK (requested_current_page >= 0),
  previous_page integer NOT NULL CHECK (previous_page >= 0),
  reading_time_seconds integer NOT NULL DEFAULT 0 CHECK (reading_time_seconds BETWEEN 0 AND 28800),
  result_status text NOT NULL CHECK (result_status IN ('planned', 'reading', 'completed', 'will_retry')),
  result_updated_at timestamptz NOT NULL,
  history_id uuid REFERENCES public.reading_progress_history(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS reading_progress_requests_book_id_idx
ON public.reading_progress_requests (book_id, created_at DESC);

ALTER TABLE public.reading_progress_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reading_progress_requests FROM PUBLIC, anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.update_reading_progress(
  p_book_id uuid,
  p_current_page integer,
  p_expected_current_page integer,
  p_idempotency_key uuid,
  p_reading_time integer DEFAULT 0
)
RETURNS TABLE (
  book_id uuid,
  previous_page integer,
  current_page integer,
  status text,
  updated_at timestamptz,
  history_id uuid,
  history_recorded boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.reading_progress_requests%ROWTYPE;
  v_book public.books%ROWTYPE;
  v_history_id uuid;
  v_next_status text;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'unauthorized';
  END IF;

  IF p_book_id IS NULL
     OR p_current_page IS NULL
     OR p_expected_current_page IS NULL
     OR p_idempotency_key IS NULL
     OR p_reading_time IS NULL
     OR p_current_page < 0
     OR p_expected_current_page < 0
     OR p_reading_time < 0
     OR p_reading_time > 28800 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_progress_request';
  END IF;

  SELECT *
  INTO v_request
  FROM public.reading_progress_requests
  WHERE user_id = v_user_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_request.book_id IS DISTINCT FROM p_book_id
       OR v_request.expected_current_page IS DISTINCT FROM p_expected_current_page
       OR v_request.requested_current_page IS DISTINCT FROM p_current_page
       OR v_request.reading_time_seconds IS DISTINCT FROM p_reading_time THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'idempotency_conflict';
    END IF;

    RETURN QUERY
    SELECT
      v_request.book_id,
      v_request.previous_page,
      v_request.requested_current_page,
      v_request.result_status,
      v_request.result_updated_at,
      v_request.history_id,
      v_request.history_id IS NOT NULL;
    RETURN;
  END IF;

  SELECT *
  INTO v_book
  FROM public.books
  WHERE id = p_book_id
    AND user_id = v_user_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'book_not_found';
  END IF;

  INSERT INTO public.reading_progress_requests (
    user_id,
    idempotency_key,
    book_id,
    expected_current_page,
    requested_current_page,
    previous_page,
    reading_time_seconds,
    result_status,
    result_updated_at
  ) VALUES (
    v_user_id,
    p_idempotency_key,
    p_book_id,
    p_expected_current_page,
    p_current_page,
    v_book.current_page,
    p_reading_time,
    'reading',
    clock_timestamp()
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    SELECT *
    INTO v_request
    FROM public.reading_progress_requests
    WHERE user_id = v_user_id
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF v_request.book_id IS DISTINCT FROM p_book_id
       OR v_request.expected_current_page IS DISTINCT FROM p_expected_current_page
       OR v_request.requested_current_page IS DISTINCT FROM p_current_page
       OR v_request.reading_time_seconds IS DISTINCT FROM p_reading_time THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'idempotency_conflict';
    END IF;

    RETURN QUERY
    SELECT
      v_request.book_id,
      v_request.previous_page,
      v_request.requested_current_page,
      v_request.result_status,
      v_request.result_updated_at,
      v_request.history_id,
      v_request.history_id IS NOT NULL;
    RETURN;
  END IF;

  IF v_book.current_page IS DISTINCT FROM p_expected_current_page THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'progress_conflict',
      DETAIL = format(
        'expected_current_page=%s; actual_current_page=%s',
        p_expected_current_page,
        v_book.current_page
      );
  END IF;

  IF p_current_page > v_book.total_pages THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_progress_page';
  END IF;

  v_next_status := v_book.status;
  IF v_book.total_pages > 0 AND p_current_page >= v_book.total_pages THEN
    v_next_status := 'completed';
  END IF;

  UPDATE public.books
  SET
    current_page = p_current_page,
    status = v_next_status,
    updated_at = clock_timestamp()
  WHERE id = p_book_id
  RETURNING public.books.updated_at INTO v_updated_at;

  IF p_current_page > v_book.current_page THEN
    INSERT INTO public.reading_progress_history (
      user_id,
      book_id,
      page,
      previous_page,
      reading_time,
      idempotency_key
    ) VALUES (
      v_user_id,
      p_book_id,
      p_current_page,
      v_book.current_page,
      p_reading_time,
      p_idempotency_key
    )
    RETURNING id INTO v_history_id;
  END IF;

  UPDATE public.reading_progress_requests
  SET
    previous_page = v_book.current_page,
    result_status = v_next_status,
    result_updated_at = v_updated_at,
    history_id = v_history_id
  WHERE user_id = v_user_id
    AND idempotency_key = p_idempotency_key;

  RETURN QUERY
  SELECT
    p_book_id,
    v_book.current_page,
    p_current_page,
    v_next_status,
    v_updated_at,
    v_history_id,
    v_history_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.update_reading_progress(uuid, integer, integer, uuid, integer)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_reading_progress(uuid, integer, integer, uuid, integer)
TO authenticated;
