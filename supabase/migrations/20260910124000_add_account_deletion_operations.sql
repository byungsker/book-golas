CREATE TABLE IF NOT EXISTS public.account_deletion_operations (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'data_deleted', 'completed')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.account_deletion_operations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.account_deletion_operations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.account_deletion_operations TO service_role;

CREATE INDEX IF NOT EXISTS account_deletion_operations_user_idx
  ON public.account_deletion_operations (user_id, updated_at DESC);
