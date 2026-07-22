ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND email = auth.jwt() ->> 'email'
    AND revenuecat_user_id = id::text
    AND role = 'user'
    AND subscription_status = 'free'
  );

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT INSERT (id, email, nickname, name, avatar_url, metadata, revenuecat_user_id)
  ON TABLE public.users TO authenticated;
GRANT UPDATE (nickname, name, avatar_url, metadata, last_sign_in_at)
  ON TABLE public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    nickname,
    name,
    revenuecat_user_id,
    created_at,
    last_sign_in_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@bookgolas.local'),
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data ->> 'name',
    NEW.id::text,
    NEW.created_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.users (
  id,
  email,
  nickname,
  name,
  revenuecat_user_id,
  created_at,
  last_sign_in_at
)
SELECT
  auth_user.id,
  COALESCE(auth_user.email, auth_user.id::text || '@bookgolas.local'),
  COALESCE(
    auth_user.raw_user_meta_data ->> 'name',
    split_part(COALESCE(auth_user.email, ''), '@', 1)
  ),
  auth_user.raw_user_meta_data ->> 'name',
  auth_user.id::text,
  auth_user.created_at,
  auth_user.last_sign_in_at
FROM auth.users AS auth_user
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_ai_recall_usage(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM increment_ai_recall_usage.user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users AS target_user
  SET
    ai_recall_usage_count = CASE
      WHEN target_user.ai_recall_reset_at IS NULL
        OR target_user.ai_recall_reset_at <= now() THEN 1
      ELSE COALESCE(target_user.ai_recall_usage_count, 0) + 1
    END,
    ai_recall_reset_at = CASE
      WHEN target_user.ai_recall_reset_at IS NULL
        OR target_user.ai_recall_reset_at <= now()
        THEN date_trunc('month', now()) + interval '1 month'
      ELSE target_user.ai_recall_reset_at
    END
  WHERE target_user.id = increment_ai_recall_usage.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ocr_daily_usage(p_user_id UUID)
RETURNS TABLE(new_count INT, daily_limit INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users AS target_user
  SET
    ocr_daily_usage_count = CASE
      WHEN target_user.ocr_usage_reset_date < CURRENT_DATE THEN 1
      ELSE COALESCE(target_user.ocr_daily_usage_count, 0) + 1
    END,
    ocr_usage_reset_date = CURRENT_DATE
  WHERE target_user.id = p_user_id
  RETURNING target_user.ocr_daily_usage_count INTO v_count;

  RETURN QUERY SELECT v_count, 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ocr_daily_usage(p_user_id UUID)
RETURNS TABLE(usage_count INT, reset_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN target_user.ocr_usage_reset_date < CURRENT_DATE THEN 0
      ELSE COALESCE(target_user.ocr_daily_usage_count, 0)
    END,
    target_user.ocr_usage_reset_date
  FROM public.users AS target_user
  WHERE target_user.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_recall_usage(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_ocr_daily_usage(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_ocr_daily_usage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_ai_recall_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ocr_daily_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ocr_daily_usage(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.match_reading_content(
  extensions.vector(1536), INT, UUID, UUID
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_user_interests(
  extensions.vector(1536), INT, JSONB
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_recommendations()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_insights()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_reading_content(
  extensions.vector(1536), INT, UUID, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_user_interests(
  extensions.vector(1536), INT, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_recommendations()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_insights()
  TO service_role;
