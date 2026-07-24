CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS genre text,
  ADD COLUMN IF NOT EXISTS publisher text,
  ADD COLUMN IF NOT EXISTS isbn text,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS review text,
  ADD COLUMN IF NOT EXISTS review_link text,
  ADD COLUMN IF NOT EXISTS aladin_url text,
  ADD COLUMN IF NOT EXISTS long_review text,
  ADD COLUMN IF NOT EXISTS total_reading_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.books'::regclass
      AND conname = 'books_rating_check'
  ) THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_rating_check
      CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
  END IF;
END
$$;

ALTER TABLE public.book_images
  ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.reading_progress_history
  ADD COLUMN IF NOT EXISTS reading_time integer DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revenuecat_user_id text,
  ADD COLUMN IF NOT EXISTS ai_recall_usage_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_recall_reset_at timestamptz;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_subscription_status_check;

UPDATE public.users
SET
  subscription_status = 'free',
  subscription_expires_at = NULL
WHERE subscription_status = 'pro_lifetime';

ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_status_check
  CHECK (subscription_status IN ('free', 'pro_monthly', 'pro_yearly'));

UPDATE public.users
SET revenuecat_user_id = id::text
WHERE revenuecat_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_books_genre
  ON public.books(genre)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_books_rating
  ON public.books(rating)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_books_isbn
  ON public.books(isbn)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_subscription_status
  ON public.users(subscription_status);

CREATE INDEX IF NOT EXISTS idx_users_revenuecat_user_id
  ON public.users(revenuecat_user_id);

CREATE TABLE IF NOT EXISTS public.reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  target_books integer NOT NULL CHECK (target_books > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_reading_goals_user_year
  ON public.reading_goals(user_id, year);

ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_goals'
      AND policyname = 'Users can view own goals'
  ) THEN
    CREATE POLICY "Users can view own goals"
      ON public.reading_goals FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_goals'
      AND policyname = 'Users can insert own goals'
  ) THEN
    CREATE POLICY "Users can insert own goals"
      ON public.reading_goals FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_goals'
      AND policyname = 'Users can update own goals'
  ) THEN
    CREATE POLICY "Users can update own goals"
      ON public.reading_goals FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_goals'
      AND policyname = 'Users can delete own goals'
  ) THEN
    CREATE POLICY "Users can delete own goals"
      ON public.reading_goals FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.update_reading_goals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reading_goals_updated_at
  ON public.reading_goals;

CREATE TRIGGER trigger_reading_goals_updated_at
  BEFORE UPDATE ON public.reading_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reading_goals_updated_at();

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.reading_sessions AS reading_session
    LEFT JOIN auth.users AS auth_user
      ON auth_user.id = reading_session.user_id
    WHERE auth_user.id IS NULL
  ) THEN
    RAISE EXCEPTION 'reading_sessions contains orphan user_id values';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reading_sessions AS reading_session
    LEFT JOIN public.books AS book
      ON book.id = reading_session.book_id
    WHERE book.id IS NULL
  ) THEN
    RAISE EXCEPTION 'reading_sessions contains orphan book_id values';
  END IF;
END
$$;

ALTER TABLE public.reading_sessions
  DROP CONSTRAINT IF EXISTS reading_sessions_user_id_fkey,
  DROP CONSTRAINT IF EXISTS reading_sessions_book_id_fkey;

ALTER TABLE public.reading_sessions
  ADD CONSTRAINT reading_sessions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  ADD CONSTRAINT reading_sessions_book_id_fkey
    FOREIGN KEY (book_id)
    REFERENCES public.books(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_started_at
  ON public.reading_sessions(user_id, started_at DESC);

ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_sessions'
      AND policyname = 'Users can view own reading sessions'
  ) THEN
    CREATE POLICY "Users can view own reading sessions"
      ON public.reading_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_sessions'
      AND policyname = 'Users can insert own reading sessions'
  ) THEN
    CREATE POLICY "Users can insert own reading sessions"
      ON public.reading_sessions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_sessions'
      AND policyname = 'Users can update own reading sessions'
  ) THEN
    CREATE POLICY "Users can update own reading sessions"
      ON public.reading_sessions FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_sessions'
      AND policyname = 'Users can delete own reading sessions'
  ) THEN
    CREATE POLICY "Users can delete own reading sessions"
      ON public.reading_sessions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.reading_content_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  content_type text NOT NULL
    CHECK (content_type IN ('highlight', 'note', 'photo_ocr')),
  content_text text NOT NULL,
  page_number integer,
  embedding extensions.vector(1536),
  source_id uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_source UNIQUE (content_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
  ON public.reading_content_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_embeddings_user_book
  ON public.reading_content_embeddings(user_id, book_id);

ALTER TABLE public.reading_content_embeddings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_content_embeddings'
      AND policyname = 'Users can view own embeddings'
  ) THEN
    CREATE POLICY "Users can view own embeddings"
      ON public.reading_content_embeddings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_content_embeddings'
      AND policyname = 'Users can insert own embeddings'
  ) THEN
    CREATE POLICY "Users can insert own embeddings"
      ON public.reading_content_embeddings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_content_embeddings'
      AND policyname = 'Users can update own embeddings'
  ) THEN
    CREATE POLICY "Users can update own embeddings"
      ON public.reading_content_embeddings FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_content_embeddings'
      AND policyname = 'Users can delete own embeddings'
  ) THEN
    CREATE POLICY "Users can delete own embeddings"
      ON public.reading_content_embeddings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.recall_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  query text NOT NULL,
  answer text,
  sources jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recall_search_history
  ALTER COLUMN book_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recall_history_user
  ON public.recall_search_history(user_id, created_at DESC);

ALTER TABLE public.recall_search_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recall_search_history'
      AND policyname = 'Users can view own search history'
  ) THEN
    CREATE POLICY "Users can view own search history"
      ON public.recall_search_history FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recall_search_history'
      AND policyname = 'Users can insert own search history'
  ) THEN
    CREATE POLICY "Users can insert own search history"
      ON public.recall_search_history FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.note_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  structure_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_note_structures_user_book
  ON public.note_structures(user_id, book_id);

ALTER TABLE public.note_structures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'note_structures'
      AND policyname = 'Users can manage own structures'
  ) THEN
    CREATE POLICY "Users can manage own structures"
      ON public.note_structures FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.reading_insights_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_content text NOT NULL,
  insight_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '12 months'
);

CREATE INDEX IF NOT EXISTS idx_reading_insights_memory_user
  ON public.reading_insights_memory(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_insights_memory_expires
  ON public.reading_insights_memory(expires_at);

ALTER TABLE public.reading_insights_memory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reading_insights_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_generated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reading_insights_rate_limit_user
  ON public.reading_insights_rate_limit(user_id);

ALTER TABLE public.reading_insights_rate_limit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_memory'
      AND policyname = 'Users can view own insights memory'
  ) THEN
    CREATE POLICY "Users can view own insights memory"
      ON public.reading_insights_memory FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_memory'
      AND policyname = 'Users can insert own insights memory'
  ) THEN
    CREATE POLICY "Users can insert own insights memory"
      ON public.reading_insights_memory FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_memory'
      AND policyname = 'Users can update own insights memory'
  ) THEN
    CREATE POLICY "Users can update own insights memory"
      ON public.reading_insights_memory FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_memory'
      AND policyname = 'Users can delete own insights memory'
  ) THEN
    CREATE POLICY "Users can delete own insights memory"
      ON public.reading_insights_memory FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_rate_limit'
      AND policyname = 'Users can view own rate limit'
  ) THEN
    CREATE POLICY "Users can view own rate limit"
      ON public.reading_insights_rate_limit FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_rate_limit'
      AND policyname = 'Users can insert own rate limit'
  ) THEN
    CREATE POLICY "Users can insert own rate limit"
      ON public.reading_insights_rate_limit FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_rate_limit'
      AND policyname = 'Users can update own rate limit'
  ) THEN
    CREATE POLICY "Users can update own rate limit"
      ON public.reading_insights_rate_limit FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_insights_rate_limit'
      AND policyname = 'Users can delete own rate limit'
  ) THEN
    CREATE POLICY "Users can delete own rate limit"
      ON public.reading_insights_rate_limit FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.book_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations jsonb NOT NULL,
  profile_summary jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

CREATE INDEX IF NOT EXISTS idx_book_recommendations_user
  ON public.book_recommendations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_recommendations_expires
  ON public.book_recommendations(expires_at);

ALTER TABLE public.book_recommendations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'book_recommendations'
      AND policyname = 'Users can view own recommendations'
  ) THEN
    CREATE POLICY "Users can view own recommendations"
      ON public.book_recommendations FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'book_recommendations'
      AND policyname = 'Users can insert own recommendations'
  ) THEN
    CREATE POLICY "Users can insert own recommendations"
      ON public.book_recommendations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'book_recommendations'
      AND policyname = 'Users can delete own recommendations'
  ) THEN
    CREATE POLICY "Users can delete own recommendations"
      ON public.book_recommendations FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.ai_recall_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recall_id uuid,
  used_at timestamptz DEFAULT now(),
  subscription_status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.recall_history') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.ai_recall_usage'::regclass
        AND conname = 'ai_recall_usage_recall_id_fkey'
    )
  THEN
    ALTER TABLE public.ai_recall_usage
      ADD CONSTRAINT ai_recall_usage_recall_id_fkey
      FOREIGN KEY (recall_id)
      REFERENCES public.recall_history(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  product_id text NOT NULL,
  transaction_id text,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_event_type_check
  CHECK (
    event_type IN (
      'initial_purchase',
      'renewal',
      'cancellation',
      'expiration',
      'refund',
      'billing_issue',
      'uncancellation',
      'product_change'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_recall_usage_user_id
  ON public.ai_recall_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_recall_usage_used_at
  ON public.ai_recall_usage(used_at);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id
  ON public.subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at
  ON public.subscription_events(created_at);

ALTER TABLE public.ai_recall_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_recall_usage'
      AND policyname = 'Users can view their own AI Recall usage'
  ) THEN
    CREATE POLICY "Users can view their own AI Recall usage"
      ON public.ai_recall_usage FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_recall_usage'
      AND policyname = 'Users can insert their own AI Recall usage'
  ) THEN
    CREATE POLICY "Users can insert their own AI Recall usage"
      ON public.ai_recall_usage FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_events'
      AND policyname = 'Users can view their own subscription events'
  ) THEN
    CREATE POLICY "Users can view their own subscription events"
      ON public.subscription_events FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_events'
      AND policyname = 'Service role can insert subscription events'
  ) THEN
    CREATE POLICY "Service role can insert subscription events"
      ON public.subscription_events FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.match_reading_content(
  extensions.vector(1536),
  integer,
  uuid,
  uuid
);

CREATE OR REPLACE FUNCTION public.match_reading_content(
  query_embedding extensions.vector(1536),
  match_count integer DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
  filter_book_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  book_id uuid,
  content_text text,
  content_type text,
  page_number integer,
  source_id uuid,
  created_at timestamptz,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rce.id,
    rce.book_id,
    rce.content_text,
    rce.content_type,
    rce.page_number,
    rce.source_id,
    rce.created_at,
    1 - (rce.embedding <=> query_embedding)
  FROM public.reading_content_embeddings AS rce
  WHERE (filter_user_id IS NULL OR rce.user_id = filter_user_id)
    AND (filter_book_id IS NULL OR rce.book_id = filter_book_id)
    AND rce.embedding IS NOT NULL
  ORDER BY rce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_user_interests(
  query_embedding extensions.vector(1536),
  match_count integer DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  filter_user_id uuid;
BEGIN
  filter_user_id := (filter ->> 'user_id')::uuid;

  RETURN QUERY
  SELECT
    rce.id,
    rce.content_text,
    jsonb_build_object(
      'book_id', rce.book_id,
      'content_type', rce.content_type,
      'page_number', rce.page_number,
      'source_id', rce.source_id,
      'user_id', rce.user_id
    ),
    1 - (rce.embedding <=> query_embedding)
  FROM public.reading_content_embeddings AS rce
  WHERE (filter_user_id IS NULL OR rce.user_id = filter_user_id)
    AND rce.embedding IS NOT NULL
  ORDER BY rce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.book_recommendations
  WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.reading_insights_memory
  WHERE expires_at < now();
END;
$$;

REVOKE ALL ON FUNCTION public.match_reading_content(
  extensions.vector(1536),
  integer,
  uuid,
  uuid
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.match_user_interests(
  extensions.vector(1536),
  integer,
  jsonb
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.cleanup_expired_recommendations()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.cleanup_expired_insights()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_reading_content(
  extensions.vector(1536),
  integer,
  uuid,
  uuid
) TO service_role;

GRANT EXECUTE ON FUNCTION public.match_user_interests(
  extensions.vector(1536),
  integer,
  jsonb
) TO service_role;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_recommendations()
  TO service_role;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_insights()
  TO service_role;
