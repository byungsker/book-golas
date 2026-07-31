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

ALTER TABLE public.third_party_ai_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI consents"
  ON public.third_party_ai_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can grant their own AI consents"
  ON public.third_party_ai_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI consents"
  ON public.third_party_ai_consents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON TABLE public.third_party_ai_consents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.third_party_ai_consents
  TO authenticated;
