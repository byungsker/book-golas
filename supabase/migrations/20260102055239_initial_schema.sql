-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nickname text,
  name text,
  avatar_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  last_sign_in_at timestamptz
);

-- Books table
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  start_date timestamptz NOT NULL,
  target_date timestamptz NOT NULL,
  image_url text,
  current_page integer DEFAULT 0,
  total_pages integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid,
  status text DEFAULT 'reading'::text,
  attempt_count integer DEFAULT 1 NOT NULL,
  daily_target_pages integer
);

-- Book images table
CREATE TABLE IF NOT EXISTS public.book_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id),
  image_url text,
  caption text,
  created_at timestamptz DEFAULT now(),
  user_id uuid,
  extracted_text text,
  page_number integer
);

COMMENT ON COLUMN public.book_images.extracted_text IS 'OCR로 추출된 텍스트 (Google Cloud Vision API)';

-- Reading progress history table
CREATE TABLE IF NOT EXISTS public.reading_progress_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  page integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  memo text,
  progress_type text,
  previous_page integer DEFAULT 0
);

-- FCM tokens table
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  token text NOT NULL,
  device_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  preferred_hour integer DEFAULT 9 CHECK (preferred_hour >= 0 AND preferred_hour <= 23),
  notification_enabled boolean DEFAULT true
);

ALTER TABLE public.fcm_tokens
  ADD COLUMN IF NOT EXISTS preferred_hour integer DEFAULT 9
  CHECK (preferred_hour >= 0 AND preferred_hour <= 23);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fcm_tokens'
      AND column_name = 'preferred_hour'
  ) THEN
    COMMENT ON COLUMN public.fcm_tokens.preferred_hour IS '알림 받을 시간 (0-23, KST 기준). 기본값 9 (오전 9시)';
  END IF;
END
$$;
COMMENT ON COLUMN public.fcm_tokens.notification_enabled IS '푸시 알림 활성화 여부. 기본값 true';

-- Push templates table
CREATE TABLE IF NOT EXISTS public.push_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  title text NOT NULL,
  body_template text NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Push logs table
CREATE TABLE IF NOT EXISTS public.push_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  push_type text NOT NULL,
  book_id uuid,
  title text,
  body text,
  sent_at timestamptz DEFAULT now(),
  is_clicked boolean DEFAULT false,
  clicked_at timestamptz
);

-- Enable RLS on tables
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for books
DROP POLICY IF EXISTS "Users can view their own books" ON public.books;
DROP POLICY IF EXISTS "Users can insert their own books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
DROP POLICY IF EXISTS "Users can delete their own books" ON public.books;
CREATE POLICY "Users can view their own books" ON public.books
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own books" ON public.books
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own books" ON public.books
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own books" ON public.books
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for book_images
DROP POLICY IF EXISTS "Users can view their own book images" ON public.book_images;
DROP POLICY IF EXISTS "Users can insert their own book images" ON public.book_images;
DROP POLICY IF EXISTS "Users can update their own book images" ON public.book_images;
DROP POLICY IF EXISTS "Users can delete their own book images" ON public.book_images;
CREATE POLICY "Users can view their own book images" ON public.book_images
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own book images" ON public.book_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own book images" ON public.book_images
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own book images" ON public.book_images
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reading_progress_history
DROP POLICY IF EXISTS "Users can view their own progress" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.reading_progress_history;
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.reading_progress_history;
CREATE POLICY "Users can view their own progress" ON public.reading_progress_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.reading_progress_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.reading_progress_history
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own progress" ON public.reading_progress_history
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fcm_tokens
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.fcm_tokens;
CREATE POLICY "Users can view their own tokens" ON public.fcm_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tokens" ON public.fcm_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens" ON public.fcm_tokens
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tokens" ON public.fcm_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for push_templates (read-only for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.push_templates;
CREATE POLICY "Authenticated users can view templates" ON public.push_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for push_logs
DROP POLICY IF EXISTS "Users can view their own logs" ON public.push_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.push_logs;
CREATE POLICY "Users can view their own logs" ON public.push_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own logs" ON public.push_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
