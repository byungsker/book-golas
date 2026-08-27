CREATE TABLE IF NOT EXISTS public.ai_usage_buckets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_chars BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_leases_user_idx
  ON public.ai_usage_leases(user_id, expires_at);

ALTER TABLE public.ai_usage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_leases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_usage_buckets FROM anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_leases FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_usage(p_input_chars INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  current_window TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  bucket public.ai_usage_buckets%ROWTYPE;
  active_leases INTEGER;
  lease_id UUID;
  request_limit CONSTANT INTEGER := 30;
  input_limit CONSTANT BIGINT := 150000;
  request_input_limit CONSTANT INTEGER := 20000;
  concurrency_limit CONSTANT INTEGER := 3;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_input_chars IS NULL OR p_input_chars < 0 OR p_input_chars > request_input_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'input_too_large',
      'requestInputLimit', request_input_limit
    );
  END IF;

  INSERT INTO public.ai_usage_buckets (user_id, window_started_at)
  VALUES (actor_id, current_window)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO bucket
  FROM public.ai_usage_buckets
  WHERE user_id = actor_id
  FOR UPDATE;

  DELETE FROM public.ai_usage_leases
  WHERE user_id = actor_id
    AND expires_at <= now();

  SELECT COUNT(*) INTO active_leases
  FROM public.ai_usage_leases
  WHERE user_id = actor_id;

  IF active_leases >= concurrency_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'concurrency_exceeded',
      'concurrencyLimit', concurrency_limit
    );
  END IF;

  IF bucket.window_started_at < current_window THEN
    bucket.window_started_at := current_window;
    bucket.request_count := 0;
    bucket.input_chars := 0;
  END IF;

  IF bucket.request_count >= request_limit OR bucket.input_chars + p_input_chars > input_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'requestLimit', request_limit,
      'inputLimit', input_limit,
      'requestsUsed', bucket.request_count,
      'inputCharsUsed', bucket.input_chars
    );
  END IF;

  UPDATE public.ai_usage_buckets
  SET window_started_at = bucket.window_started_at,
      request_count = bucket.request_count + 1,
      input_chars = bucket.input_chars + p_input_chars,
      updated_at = now()
  WHERE user_id = actor_id;

  INSERT INTO public.ai_usage_leases (user_id, expires_at)
  VALUES (actor_id, now() + interval '60 seconds')
  RETURNING id INTO lease_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'leaseId', lease_id,
    'requestLimit', request_limit,
    'inputLimit', input_limit,
    'requestsUsed', bucket.request_count + 1,
    'inputCharsUsed', bucket.input_chars + p_input_chars
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_usage(p_lease_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.ai_usage_leases
  WHERE id = p_lease_id
    AND user_id = actor_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_usage(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage(INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.release_ai_usage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_ai_usage(UUID) TO authenticated;
