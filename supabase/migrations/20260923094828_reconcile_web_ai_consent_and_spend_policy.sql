CREATE TABLE IF NOT EXISTS public.third_party_ai_consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_cloud_vision', 'open_ai')),
  policy_version integer NOT NULL CHECK (policy_version > 0),
  disclosure_locale text NOT NULL CHECK (btrim(disclosure_locale) <> ''),
  disclosure_snapshot jsonb NOT NULL CHECK (jsonb_typeof(disclosure_snapshot) = 'object'),
  granted boolean NOT NULL,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, provider),
  CHECK (
    (granted AND granted_at IS NOT NULL AND withdrawn_at IS NULL)
    OR (NOT granted AND withdrawn_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.third_party_ai_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_cloud_vision', 'open_ai')),
  policy_version integer NOT NULL CHECK (policy_version > 0),
  disclosure_locale text NOT NULL CHECK (btrim(disclosure_locale) <> ''),
  disclosure_snapshot jsonb NOT NULL CHECK (jsonb_typeof(disclosure_snapshot) = 'object'),
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS third_party_ai_consent_events_user_provider_created_idx
  ON public.third_party_ai_consent_events (user_id, provider, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_third_party_ai_consent_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = OLD.user_id
  ) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Third-party AI consent events are append-only'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS prevent_third_party_ai_consent_event_mutation
  ON public.third_party_ai_consent_events;
CREATE TRIGGER prevent_third_party_ai_consent_event_mutation
BEFORE UPDATE OR DELETE ON public.third_party_ai_consent_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_third_party_ai_consent_event_mutation();

ALTER TABLE public.third_party_ai_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_ai_consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI consents"
  ON public.third_party_ai_consents;
CREATE POLICY "Users can view their own AI consents"
  ON public.third_party_ai_consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own AI consent history"
  ON public.third_party_ai_consent_events;
CREATE POLICY "Users can view their own AI consent history"
  ON public.third_party_ai_consent_events FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.third_party_ai_consents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.third_party_ai_consent_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.third_party_ai_consents TO authenticated;
GRANT SELECT ON TABLE public.third_party_ai_consent_events TO authenticated;

CREATE OR REPLACE FUNCTION public.record_third_party_ai_consent(
  p_provider text,
  p_policy_version integer,
  p_granted boolean,
  p_disclosure_locale text DEFAULT NULL,
  p_disclosure_snapshot jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  consent_kind text;
  consent_version text;
  effective_policy_version integer := p_policy_version;
  effective_locale text := p_disclosure_locale;
  effective_snapshot jsonb := p_disclosure_snapshot;
  recorded_at timestamptz := clock_timestamp();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_provider NOT IN ('google_cloud_vision', 'open_ai')
    OR p_policy_version IS NULL OR p_policy_version <= 0
    OR p_granted IS NULL
  THEN
    RAISE EXCEPTION 'Invalid third-party AI consent input' USING ERRCODE = '22023';
  END IF;

  consent_kind := CASE p_provider
    WHEN 'google_cloud_vision' THEN 'ocr'
    WHEN 'open_ai' THEN 'ai'
  END;
  consent_version := 'third-party-ai-v' || p_policy_version::text;

  IF p_granted THEN
    IF effective_locale IS NULL OR btrim(effective_locale) = ''
      OR effective_snapshot IS NULL
      OR jsonb_typeof(effective_snapshot) <> 'object'
    THEN
      RAISE EXCEPTION 'Disclosure evidence is required' USING ERRCODE = '22023';
    END IF;
  ELSE
    SELECT policy_version, disclosure_locale, disclosure_snapshot
      INTO effective_policy_version, effective_locale, effective_snapshot
    FROM public.third_party_ai_consents
    WHERE user_id = actor_id AND provider = p_provider
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN false;
    END IF;
    consent_version := 'third-party-ai-v' || effective_policy_version::text;
  END IF;

  INSERT INTO public.third_party_ai_consent_events (
    user_id, provider, policy_version, disclosure_locale,
    disclosure_snapshot, granted, created_at
  ) VALUES (
    actor_id, p_provider, effective_policy_version, effective_locale,
    effective_snapshot, p_granted, recorded_at
  );

  INSERT INTO public.third_party_ai_consents (
    user_id, provider, policy_version, disclosure_locale,
    disclosure_snapshot, granted, granted_at, withdrawn_at, updated_at
  ) VALUES (
    actor_id, p_provider, effective_policy_version, effective_locale,
    effective_snapshot, p_granted,
    CASE WHEN p_granted THEN recorded_at ELSE NULL END,
    CASE WHEN p_granted THEN NULL ELSE recorded_at END,
    recorded_at
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

  INSERT INTO public.user_consents (
    user_id, kind, status, version, granted_at, updated_at
  ) VALUES (
    actor_id, consent_kind,
    CASE WHEN p_granted THEN 'granted' ELSE 'denied' END,
    consent_version,
    CASE WHEN p_granted THEN recorded_at ELSE NULL END,
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

REVOKE ALL ON FUNCTION public.prevent_third_party_ai_consent_event_mutation()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_third_party_ai_consent(text, integer, boolean, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_third_party_ai_consent(text, integer, boolean, text, jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_canonical_ai_consent_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  mapped_provider text;
  recorded_at timestamptz := clock_timestamp();
BEGIN
  mapped_provider := CASE NEW.kind
    WHEN 'ai' THEN 'open_ai'
    WHEN 'ocr' THEN 'google_cloud_vision'
    ELSE NULL
  END;
  IF mapped_provider IS NULL
    OR (NEW.status = 'granted' AND NEW.version = 'third-party-ai-v2')
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.third_party_ai_consent_events (
    user_id, provider, policy_version, disclosure_locale,
    disclosure_snapshot, granted, created_at
  )
  SELECT user_id, provider, policy_version, disclosure_locale,
    disclosure_snapshot, false, recorded_at
  FROM public.third_party_ai_consents
  WHERE user_id = NEW.user_id AND provider = mapped_provider AND granted;

  UPDATE public.third_party_ai_consents
  SET granted = false, withdrawn_at = recorded_at, updated_at = recorded_at
  WHERE user_id = NEW.user_id AND provider = mapped_provider AND granted;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_canonical_ai_consent_revocation
  ON public.user_consents;
CREATE TRIGGER sync_canonical_ai_consent_revocation
AFTER INSERT OR UPDATE OF status, version ON public.user_consents
FOR EACH ROW EXECUTE FUNCTION public.sync_canonical_ai_consent_revocation();

REVOKE ALL ON FUNCTION public.sync_canonical_ai_consent_revocation()
  FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.ai_pricing_registry (
  provider text NOT NULL CHECK (provider = 'open_ai'),
  model text NOT NULL CHECK (btrim(model) <> ''),
  input_microusd_per_million_tokens bigint NOT NULL CHECK (input_microusd_per_million_tokens >= 0),
  output_microusd_per_million_tokens bigint NOT NULL CHECK (output_microusd_per_million_tokens >= 0),
  pricing_version text NOT NULL CHECK (btrim(pricing_version) <> ''),
  approved boolean NOT NULL DEFAULT false,
  effective_from timestamptz NOT NULL,
  PRIMARY KEY (provider, model, effective_from)
);

INSERT INTO public.ai_pricing_registry (
  provider, model, input_microusd_per_million_tokens,
  output_microusd_per_million_tokens, pricing_version, approved, effective_from
) VALUES
  ('open_ai', 'gpt-4o-mini', 150000, 600000, 'pricing-v1', true, '2026-08-29T00:00:00Z'),
  ('open_ai', 'text-embedding-3-small', 20000, 0, 'pricing-v1', true, '2026-08-29T00:00:00Z')
ON CONFLICT (provider, model, effective_from) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_usage_policy_versions (
  policy_version text PRIMARY KEY,
  requests_per_minute integer NOT NULL CHECK (requests_per_minute > 0),
  requests_per_day integer NOT NULL CHECK (requests_per_day > 0),
  concurrent_requests integer NOT NULL CHECK (concurrent_requests > 0),
  budget_microusd_per_day bigint NOT NULL CHECK (budget_microusd_per_day > 0),
  hard_cap_microusd_per_day bigint NOT NULL CHECK (hard_cap_microusd_per_day >= budget_microusd_per_day),
  effective_from timestamptz NOT NULL
);

INSERT INTO public.ai_usage_policy_versions (
  policy_version, requests_per_minute, requests_per_day,
  concurrent_requests, budget_microusd_per_day,
  hard_cap_microusd_per_day, effective_from
) VALUES ('cost-control-v1', 10, 30, 3, 50000, 100000, '2026-08-29T00:00:00Z')
ON CONFLICT (policy_version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_usage_buckets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  minute_started_at timestamptz NOT NULL,
  minute_request_count integer NOT NULL DEFAULT 0 CHECK (minute_request_count >= 0),
  day_started_at timestamptz NOT NULL,
  day_request_count integer NOT NULL DEFAULT 0 CHECK (day_request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id text,
  call_id text NOT NULL,
  feature text NOT NULL,
  provider text NOT NULL CHECK (provider = 'open_ai'),
  model text NOT NULL,
  prompt_version text NOT NULL,
  reserved_cost_microusd bigint NOT NULL CHECK (reserved_cost_microusd >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  UNIQUE (user_id, call_id)
);

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_version integer NOT NULL CHECK (event_version = 1),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id text,
  call_id text,
  function_name text NOT NULL,
  feature text NOT NULL,
  provider text NOT NULL CHECK (provider = 'open_ai'),
  model text NOT NULL,
  prompt_version text NOT NULL,
  input_tokens integer CHECK (input_tokens BETWEEN 0 AND 1000000),
  output_tokens integer CHECK (output_tokens BETWEEN 0 AND 1000000),
  total_tokens integer CHECK (total_tokens BETWEEN 0 AND 1000000),
  estimated_cost_microusd bigint CHECK (estimated_cost_microusd >= 0),
  pricing_version text NOT NULL,
  token_status text NOT NULL CHECK (token_status IN ('valid', 'missing', 'anomalous', 'inconsistent')),
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_control_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id text,
  call_id text,
  provider text NOT NULL,
  model text NOT NULL,
  feature text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('allow', 'block', 'release')),
  reason text NOT NULL,
  estimated_cost_microusd bigint CHECK (estimated_cost_microusd >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx
  ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_control_events_user_created_idx
  ON public.ai_usage_control_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_leases_user_expires_idx
  ON public.ai_usage_leases (user_id, expires_at);

ALTER TABLE public.ai_pricing_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_control_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_pricing_registry FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_policy_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_buckets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_leases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_control_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_usage_logs TO service_role;
GRANT SELECT, INSERT ON TABLE public.ai_usage_control_events TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(
  p_feature text,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_request_id text,
  p_call_id text,
  p_input_chars integer,
  p_estimated_input_tokens integer,
  p_estimated_output_tokens integer,
  p_estimated_cost_microusd bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  recorded_at timestamptz := clock_timestamp();
  minute_start timestamptz := date_trunc('minute', recorded_at);
  day_start timestamptz := date_trunc('day', recorded_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  pricing public.ai_pricing_registry%ROWTYPE;
  policy public.ai_usage_policy_versions%ROWTYPE;
  bucket public.ai_usage_buckets%ROWTYPE;
  active_requests integer;
  actual_cost bigint;
  reserved_cost bigint;
  projected_cost bigint;
  expected_cost bigint;
  block_reason text;
  lease_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_provider <> 'open_ai'
    OR p_call_id IS NULL OR btrim(p_call_id) = ''
    OR p_feature IS NULL OR btrim(p_feature) = ''
    OR p_prompt_version IS NULL OR btrim(p_prompt_version) = ''
    OR p_input_chars IS NULL OR p_input_chars < 0 OR p_input_chars > 20000
    OR p_estimated_input_tokens IS NULL OR p_estimated_input_tokens < 0 OR p_estimated_input_tokens > 1000000
    OR p_estimated_output_tokens IS NULL OR p_estimated_output_tokens < 0 OR p_estimated_output_tokens > 1000000
    OR p_estimated_cost_microusd IS NULL OR p_estimated_cost_microusd < 0
  THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_contract_input');
  END IF;

  SELECT * INTO pricing
  FROM public.ai_pricing_registry
  WHERE provider = p_provider AND model = p_model AND approved
    AND effective_from <= recorded_at
  ORDER BY effective_from DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'model_not_allowed');
  END IF;

  expected_cost := ceil((
    p_estimated_input_tokens::numeric * pricing.input_microusd_per_million_tokens
    + p_estimated_output_tokens::numeric * pricing.output_microusd_per_million_tokens
  ) / 1000000)::bigint;
  IF expected_cost <> p_estimated_cost_microusd THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'budget_unavailable');
  END IF;

  SELECT * INTO policy
  FROM public.ai_usage_policy_versions
  WHERE effective_from <= recorded_at
  ORDER BY effective_from DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'budget_unavailable');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(actor_id::text || ':ai-usage', 0));
  DELETE FROM public.ai_usage_leases
  WHERE user_id = actor_id AND expires_at <= recorded_at;

  INSERT INTO public.ai_usage_buckets (
    user_id, minute_started_at, day_started_at
  ) VALUES (actor_id, minute_start, day_start)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO bucket
  FROM public.ai_usage_buckets
  WHERE user_id = actor_id
  FOR UPDATE;

  IF bucket.minute_started_at < minute_start THEN
    bucket.minute_started_at := minute_start;
    bucket.minute_request_count := 0;
  END IF;
  IF bucket.day_started_at < day_start THEN
    bucket.day_started_at := day_start;
    bucket.day_request_count := 0;
  END IF;

  SELECT count(*)::integer, COALESCE(sum(reserved_cost_microusd), 0)::bigint
    INTO active_requests, reserved_cost
  FROM public.ai_usage_leases
  WHERE user_id = actor_id AND expires_at > recorded_at;

  SELECT COALESCE(sum(estimated_cost_microusd), 0)::bigint
    INTO actual_cost
  FROM public.ai_usage_logs
  WHERE user_id = actor_id AND status = 'success' AND created_at >= day_start;

  projected_cost := actual_cost + reserved_cost + p_estimated_cost_microusd;
  block_reason := CASE
    WHEN active_requests >= policy.concurrent_requests THEN 'concurrency_exceeded'
    WHEN bucket.minute_request_count >= policy.requests_per_minute THEN 'rate_limit_exceeded'
    WHEN bucket.day_request_count >= policy.requests_per_day THEN 'quota_exceeded'
    WHEN projected_cost >= policy.hard_cap_microusd_per_day THEN 'hard_cap_exceeded'
    WHEN projected_cost > policy.budget_microusd_per_day THEN 'budget_exceeded'
    ELSE NULL
  END;

  IF block_reason IS NOT NULL THEN
    INSERT INTO public.ai_usage_control_events (
      user_id, request_id, call_id, provider, model, feature,
      decision, reason, estimated_cost_microusd, metadata
    ) VALUES (
      actor_id, p_request_id, p_call_id, p_provider, p_model, p_feature,
      'block', block_reason, p_estimated_cost_microusd,
      jsonb_build_object('projectedCostMicrousd', projected_cost)
    );
    RETURN jsonb_build_object('allowed', false, 'reason', block_reason);
  END IF;

  UPDATE public.ai_usage_buckets
  SET minute_started_at = bucket.minute_started_at,
    minute_request_count = bucket.minute_request_count + 1,
    day_started_at = bucket.day_started_at,
    day_request_count = bucket.day_request_count + 1,
    updated_at = recorded_at
  WHERE user_id = actor_id;

  INSERT INTO public.ai_usage_leases (
    user_id, request_id, call_id, feature, provider, model,
    prompt_version, reserved_cost_microusd, created_at, expires_at
  ) VALUES (
    actor_id, p_request_id, p_call_id, p_feature, p_provider, p_model,
    p_prompt_version, p_estimated_cost_microusd,
    recorded_at, recorded_at + interval '5 minutes'
  )
  RETURNING id INTO lease_id;

  INSERT INTO public.ai_usage_control_events (
    user_id, request_id, call_id, provider, model, feature,
    decision, reason, estimated_cost_microusd, metadata
  ) VALUES (
    actor_id, p_request_id, p_call_id, p_provider, p_model, p_feature,
    'allow', 'allowed', p_estimated_cost_microusd,
    jsonb_build_object('projectedCostMicrousd', projected_cost)
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'leaseId', lease_id,
    'policyVersion', policy.policy_version,
    'pricingVersion', pricing.pricing_version,
    'estimatedCostMicrousd', p_estimated_cost_microusd
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_usage(p_lease_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  lease public.ai_usage_leases%ROWTYPE;
BEGIN
  IF actor_id IS NULL OR p_lease_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.ai_usage_leases
  WHERE id = p_lease_id AND user_id = actor_id
  RETURNING * INTO lease;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO public.ai_usage_control_events (
    user_id, request_id, call_id, provider, model, feature,
    decision, reason, estimated_cost_microusd
  ) VALUES (
    actor_id, lease.request_id, lease.call_id, lease.provider,
    lease.model, lease.feature, 'release', 'lease_released',
    lease.reserved_cost_microusd
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_usage(
  text, text, text, text, text, text, integer, integer, integer, bigint
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_ai_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(
  text, text, text, text, text, text, integer, integer, integer, bigint
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ai_usage(uuid) TO authenticated;
