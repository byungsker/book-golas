CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('ai', 'notifications', 'camera', 'share', 'ocr')),
  status text NOT NULL CHECK (status IN ('granted', 'denied')),
  version text NOT NULL,
  granted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own consents" ON public.user_consents;
CREATE POLICY "Users can view own consents"
  ON public.user_consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own consents" ON public.user_consents;
CREATE POLICY "Users can insert own consents"
  ON public.user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own consents" ON public.user_consents;
CREATE POLICY "Users can update own consents"
  ON public.user_consents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.edge_function_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, function_name)
);

ALTER TABLE public.edge_function_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own edge function usage" ON public.edge_function_usage;
CREATE POLICY "Users can view own edge function usage"
  ON public.edge_function_usage FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE public.ai_recall_usage
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS reservation_key uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.ai_recall_usage'::regclass
      AND conname = 'ai_recall_usage_status_check'
  ) THEN
    ALTER TABLE public.ai_recall_usage
      ADD CONSTRAINT ai_recall_usage_status_check CHECK (status IN ('reserved', 'completed'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ai_recall_usage_reservation_key_idx
  ON public.ai_recall_usage (reservation_key)
  WHERE reservation_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.consume_ai_recall_quota(
  p_user_id uuid,
  p_reservation_key uuid
)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_subscription_status text;
  v_usage_count integer;
  v_reset_at timestamptz := date_trunc('month', v_now) + interval '1 month';
BEGIN
  IF p_user_id IS NULL
    OR p_reservation_key IS NULL
    OR (auth.uid() IS DISTINCT FROM p_user_id AND COALESCE(auth.role(), '') <> 'service_role')
  THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT target_user.subscription_status
    INTO v_subscription_status
  FROM public.users AS target_user
  WHERE target_user.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*)::integer
    INTO v_usage_count
  FROM public.ai_recall_usage AS usage
  WHERE usage.user_id = p_user_id
    AND usage.used_at >= date_trunc('month', v_now)
    AND usage.status IN ('reserved', 'completed');

  IF COALESCE(v_subscription_status, 'free') NOT IN ('pro_monthly', 'pro_yearly') AND v_usage_count >= 10 THEN
    RETURN QUERY SELECT false, 0, v_reset_at;
    RETURN;
  END IF;

  INSERT INTO public.ai_recall_usage (user_id, subscription_status, status, reservation_key)
  VALUES (p_user_id, COALESCE(v_subscription_status, 'free'), 'reserved', p_reservation_key);
  RETURN QUERY SELECT true,
    CASE WHEN v_subscription_status IN ('pro_monthly', 'pro_yearly') THEN NULL::integer ELSE 9 - v_usage_count END,
    v_reset_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_ai_recall_quota(p_user_id uuid)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key uuid := gen_random_uuid();
  v_result record;
BEGIN
  SELECT * INTO v_result
  FROM public.consume_ai_recall_quota(p_user_id, v_key);
  IF v_result.allowed THEN
    UPDATE public.ai_recall_usage
    SET status = 'completed', reservation_key = NULL
    WHERE user_id = p_user_id AND reservation_key = v_key;
  END IF;
  RETURN QUERY SELECT v_result.allowed, v_result.remaining, v_result.reset_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ai_recall_quota(
  p_user_id uuid,
  p_reservation_key uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL
    OR p_reservation_key IS NULL
    OR (auth.uid() IS DISTINCT FROM p_user_id AND COALESCE(auth.role(), '') <> 'service_role')
  THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ai_recall_usage
  SET status = 'completed', reservation_key = NULL
  WHERE user_id = p_user_id
    AND reservation_key = p_reservation_key
    AND status = 'reserved';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_recall_quota(
  p_user_id uuid,
  p_reservation_key uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL
    OR p_reservation_key IS NULL
    OR (auth.uid() IS DISTINCT FROM p_user_id AND COALESCE(auth.role(), '') <> 'service_role')
  THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.ai_recall_usage
  WHERE user_id = p_user_id
    AND reservation_key = p_reservation_key
    AND status = 'reserved';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_recall_quota(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_ai_recall_quota(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ai_recall_quota(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ai_recall_quota(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_recall_quota(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_recall_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ai_recall_quota(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_recall_quota(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_edge_function_budget(
  p_user_id uuid,
  p_function_name text,
  p_limit integer,
  p_window_seconds integer DEFAULT 86400
)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_started timestamptz;
  v_count integer;
  v_reset_at timestamptz;
BEGIN
  IF p_user_id IS NULL
    OR p_function_name IS NULL
    OR length(trim(p_function_name)) = 0
    OR p_limit <= 0
    OR p_window_seconds <= 0
  THEN
    RAISE EXCEPTION 'Invalid usage policy input' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id
    AND COALESCE(auth.role(), '') <> 'service_role'
  THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_function_name, 0));

  SELECT usage.window_started_at, usage.request_count
    INTO v_window_started, v_count
  FROM public.edge_function_usage AS usage
  WHERE usage.user_id = p_user_id
    AND usage.function_name = p_function_name
  FOR UPDATE;

  IF v_window_started IS NULL
    OR v_window_started + make_interval(secs => p_window_seconds) <= v_now
  THEN
    v_window_started := v_now;
    v_count := 0;
  END IF;

  v_reset_at := v_window_started + make_interval(secs => p_window_seconds);

  IF v_count >= p_limit THEN
    INSERT INTO public.edge_function_usage AS usage (
      user_id, function_name, window_started_at, request_count, updated_at
    ) VALUES (
      p_user_id, p_function_name, v_window_started, v_count, v_now
    )
    ON CONFLICT (user_id, function_name) DO UPDATE SET
      window_started_at = EXCLUDED.window_started_at,
      request_count = EXCLUDED.request_count,
      updated_at = EXCLUDED.updated_at;
    RETURN QUERY SELECT false, 0, v_reset_at;
    RETURN;
  END IF;

  v_count := v_count + 1;
  INSERT INTO public.edge_function_usage AS usage (
    user_id, function_name, window_started_at, request_count, updated_at
  ) VALUES (
    p_user_id, p_function_name, v_window_started, v_count, v_now
  )
  ON CONFLICT (user_id, function_name) DO UPDATE SET
    window_started_at = EXCLUDED.window_started_at,
    request_count = EXCLUDED.request_count,
    updated_at = EXCLUDED.updated_at;

  RETURN QUERY SELECT true, p_limit - v_count, v_reset_at;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_function_budget(uuid, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_function_budget(uuid, text, integer, integer)
  TO service_role;
