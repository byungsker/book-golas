ALTER TABLE public.ai_recall_usage
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;

UPDATE public.ai_recall_usage
SET reservation_expires_at = COALESCE(used_at, now()) + interval '5 minutes'
WHERE status = 'reserved'
  AND reservation_expires_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.ai_recall_usage'::regclass
      AND conname = 'ai_recall_usage_reservation_expiry_check'
  ) THEN
    ALTER TABLE public.ai_recall_usage
      ADD CONSTRAINT ai_recall_usage_reservation_expiry_check CHECK (
        (status = 'reserved' AND reservation_expires_at IS NOT NULL)
        OR (status = 'completed' AND reservation_expires_at IS NULL)
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS ai_recall_usage_active_reservation_idx
  ON public.ai_recall_usage (user_id, reservation_expires_at)
  WHERE status = 'reserved';

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

  DELETE FROM public.ai_recall_usage
  WHERE user_id = p_user_id
    AND status = 'reserved'
    AND reservation_expires_at <= v_now;

  SELECT count(*)::integer
    INTO v_usage_count
  FROM public.ai_recall_usage AS usage
  WHERE usage.user_id = p_user_id
    AND usage.used_at >= date_trunc('month', v_now)
    AND (
      usage.status = 'completed'
      OR (usage.status = 'reserved' AND usage.reservation_expires_at > v_now)
    );

  IF COALESCE(v_subscription_status, 'free') NOT IN ('pro_monthly', 'pro_yearly') AND v_usage_count >= 10 THEN
    RETURN QUERY SELECT false, 0, v_reset_at;
    RETURN;
  END IF;

  INSERT INTO public.ai_recall_usage (
    user_id,
    subscription_status,
    status,
    reservation_key,
    reservation_expires_at
  ) VALUES (
    p_user_id,
    COALESCE(v_subscription_status, 'free'),
    'reserved',
    p_reservation_key,
    v_now + interval '5 minutes'
  );
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
    SET status = 'completed', reservation_key = NULL, reservation_expires_at = NULL
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
  SET status = 'completed', reservation_key = NULL, reservation_expires_at = NULL
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
