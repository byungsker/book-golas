DROP POLICY IF EXISTS "Users can insert own consents" ON public.user_consents;
DROP POLICY IF EXISTS "Users can update own consents" ON public.user_consents;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_consents FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_consents TO authenticated;

CREATE OR REPLACE FUNCTION public.record_user_consent(
  p_kind text,
  p_status text,
  p_version text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  normalized_kind text := btrim(p_kind);
  normalized_status text := btrim(p_status);
  normalized_version text := btrim(p_version);
  recorded_at timestamptz := clock_timestamp();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_kind IS NULL
    OR normalized_kind NOT IN ('ai', 'notifications', 'camera', 'share', 'ocr')
  THEN
    RAISE EXCEPTION 'Unsupported consent kind' USING ERRCODE = '22023';
  END IF;

  IF normalized_status IS NULL
    OR normalized_status NOT IN ('granted', 'denied')
  THEN
    RAISE EXCEPTION 'Unsupported consent status' USING ERRCODE = '22023';
  END IF;

  IF normalized_version IS NULL
    OR length(normalized_version) = 0
    OR octet_length(normalized_version) > 80
  THEN
    RAISE EXCEPTION 'Consent version is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_consents (
    user_id,
    kind,
    status,
    version,
    granted_at,
    updated_at
  ) VALUES (
    actor_id,
    normalized_kind,
    normalized_status,
    normalized_version,
    CASE WHEN normalized_status = 'granted' THEN recorded_at ELSE NULL END,
    recorded_at
  )
  ON CONFLICT (user_id, kind) DO UPDATE SET
    status = EXCLUDED.status,
    version = EXCLUDED.version,
    granted_at = EXCLUDED.granted_at,
    updated_at = EXCLUDED.updated_at;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_consent(text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_user_consent(text, text, text)
  TO authenticated;
