CREATE TABLE public.third_party_ai_consents (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (
    provider IN ('google_cloud_vision', 'open_ai')
  ),
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  disclosure_locale TEXT NOT NULL CHECK (length(disclosure_locale) > 0),
  disclosure_snapshot JSONB NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider),
  CHECK (
    (granted AND granted_at IS NOT NULL AND withdrawn_at IS NULL)
    OR
    (NOT granted AND withdrawn_at IS NOT NULL)
  )
);

CREATE TABLE public.third_party_ai_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (
    provider IN ('google_cloud_vision', 'open_ai')
  ),
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  disclosure_locale TEXT NOT NULL CHECK (length(disclosure_locale) > 0),
  disclosure_snapshot JSONB NOT NULL,
  granted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX third_party_ai_consent_events_user_provider_created_idx
  ON public.third_party_ai_consent_events (
    user_id,
    provider,
    created_at DESC
  );

CREATE OR REPLACE FUNCTION public.prevent_third_party_ai_consent_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Third-party AI consent events are append-only'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER prevent_third_party_ai_consent_event_mutation
BEFORE UPDATE OR DELETE ON public.third_party_ai_consent_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_third_party_ai_consent_event_mutation();

REVOKE ALL ON FUNCTION public.prevent_third_party_ai_consent_event_mutation()
FROM PUBLIC;

ALTER TABLE public.third_party_ai_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_ai_consent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI consents"
  ON public.third_party_ai_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI consent history"
  ON public.third_party_ai_consent_events FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.third_party_ai_consents FROM anon, authenticated;
REVOKE ALL ON TABLE public.third_party_ai_consent_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.third_party_ai_consents TO authenticated;
GRANT SELECT ON TABLE public.third_party_ai_consent_events TO authenticated;

CREATE OR REPLACE FUNCTION public.record_third_party_ai_consent(
  p_provider TEXT,
  p_policy_version INTEGER,
  p_granted BOOLEAN,
  p_disclosure_locale TEXT DEFAULT NULL,
  p_disclosure_snapshot JSONB DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_policy_version INTEGER := p_policy_version;
  v_locale TEXT := p_disclosure_locale;
  v_snapshot JSONB := p_disclosure_snapshot;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_provider NOT IN ('google_cloud_vision', 'open_ai') THEN
    RAISE EXCEPTION 'Unsupported provider';
  END IF;
  IF p_policy_version <= 0 THEN
    RAISE EXCEPTION 'Invalid policy version';
  END IF;

  IF p_granted THEN
    IF v_locale IS NULL OR length(v_locale) = 0 OR v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Disclosure evidence is required';
    END IF;
  ELSE
    SELECT policy_version, disclosure_locale, disclosure_snapshot
      INTO v_policy_version, v_locale, v_snapshot
      FROM public.third_party_ai_consents
      WHERE user_id = v_user_id AND provider = p_provider;
    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;
  END IF;

  INSERT INTO public.third_party_ai_consent_events (
    user_id,
    provider,
    policy_version,
    disclosure_locale,
    disclosure_snapshot,
    granted,
    created_at
  ) VALUES (
    v_user_id,
    p_provider,
    v_policy_version,
    v_locale,
    v_snapshot,
    p_granted,
    v_now
  );

  INSERT INTO public.third_party_ai_consents (
    user_id,
    provider,
    policy_version,
    disclosure_locale,
    disclosure_snapshot,
    granted,
    granted_at,
    withdrawn_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_provider,
    v_policy_version,
    v_locale,
    v_snapshot,
    p_granted,
    CASE WHEN p_granted THEN v_now ELSE NULL END,
    CASE WHEN p_granted THEN NULL ELSE v_now END,
    v_now
  )
  ON CONFLICT (user_id, provider) DO UPDATE SET
    policy_version = EXCLUDED.policy_version,
    disclosure_locale = EXCLUDED.disclosure_locale,
    disclosure_snapshot = EXCLUDED.disclosure_snapshot,
    granted = EXCLUDED.granted,
    granted_at = CASE
      WHEN EXCLUDED.granted THEN EXCLUDED.granted_at
      ELSE public.third_party_ai_consents.granted_at
    END,
    withdrawn_at = EXCLUDED.withdrawn_at,
    updated_at = EXCLUDED.updated_at;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_third_party_ai_consent(
  TEXT,
  INTEGER,
  BOOLEAN,
  TEXT,
  JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_third_party_ai_consent(
  TEXT,
  INTEGER,
  BOOLEAN,
  TEXT,
  JSONB
) TO authenticated;
