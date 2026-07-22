-- Add subscription-related columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro_monthly', 'pro_yearly', 'pro_lifetime')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revenuecat_user_id text,
  ADD COLUMN IF NOT EXISTS ai_recall_usage_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_recall_reset_at timestamptz;

COMMENT ON COLUMN public.users.subscription_status IS 'User subscription tier: free, pro_monthly, pro_yearly, pro_lifetime';
COMMENT ON COLUMN public.users.subscription_expires_at IS 'Subscription expiration date (NULL for free tier or lifetime)';
COMMENT ON COLUMN public.users.revenuecat_user_id IS 'RevenueCat customer ID for subscription management';
COMMENT ON COLUMN public.users.ai_recall_usage_count IS 'Monthly AI Recall usage count (resets monthly)';
COMMENT ON COLUMN public.users.ai_recall_reset_at IS 'Next reset date for AI Recall usage counter';

-- Create ai_recall_usage table for tracking usage history
CREATE TABLE IF NOT EXISTS public.ai_recall_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recall_id uuid REFERENCES public.recall_search_history(id) ON DELETE SET NULL,
  used_at timestamptz DEFAULT now(),
  subscription_status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ai_recall_usage IS 'Tracks AI Recall usage for quota management';
COMMENT ON COLUMN public.ai_recall_usage.subscription_status IS 'User subscription status at the time of usage';

-- Create subscription_events table for webhook logs
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('initial_purchase', 'renewal', 'cancellation', 'expiration', 'refund', 'billing_issue')),
  product_id text NOT NULL,
  transaction_id text,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.subscription_events IS 'Logs all subscription-related events from RevenueCat webhooks';
COMMENT ON COLUMN public.subscription_events.event_type IS 'Type of subscription event';
COMMENT ON COLUMN public.subscription_events.product_id IS 'RevenueCat product ID (e.g., pro_monthly, pro_yearly, pro_lifetime)';
COMMENT ON COLUMN public.subscription_events.transaction_id IS 'RevenueCat transaction ID';
COMMENT ON COLUMN public.subscription_events.payload IS 'Full webhook payload from RevenueCat';

-- Enable RLS on new tables
ALTER TABLE public.ai_recall_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_recall_usage (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_recall_usage' AND policyname = 'Users can view their own AI Recall usage') THEN
    CREATE POLICY "Users can view their own AI Recall usage" ON public.ai_recall_usage FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_recall_usage' AND policyname = 'Users can insert their own AI Recall usage') THEN
    CREATE POLICY "Users can insert their own AI Recall usage" ON public.ai_recall_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for subscription_events (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_events' AND policyname = 'Users can view their own subscription events') THEN
    CREATE POLICY "Users can view their own subscription events" ON public.subscription_events FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_events' AND policyname = 'Service role can insert subscription events') THEN
    CREATE POLICY "Service role can insert subscription events" ON public.subscription_events FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_recall_usage_user_id ON public.ai_recall_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recall_usage_used_at ON public.ai_recall_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_revenuecat_user_id ON public.users(revenuecat_user_id);
