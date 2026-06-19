CREATE OR REPLACE FUNCTION increment_ai_recall_usage(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET
    ai_recall_usage_count = CASE
      WHEN ai_recall_reset_at IS NULL OR ai_recall_reset_at <= now() THEN 1
      ELSE COALESCE(ai_recall_usage_count, 0) + 1
    END,
    ai_recall_reset_at = CASE
      WHEN ai_recall_reset_at IS NULL OR ai_recall_reset_at <= now() THEN date_trunc('month', now()) + interval '1 month'
      ELSE ai_recall_reset_at
    END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE public.users
SET revenuecat_user_id = id::text
WHERE revenuecat_user_id IS NULL;

UPDATE public.users
SET subscription_status = 'free',
    subscription_expires_at = NULL
WHERE subscription_status = 'pro_lifetime';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_subscription_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_status_check
  CHECK (subscription_status IN ('free', 'pro_monthly', 'pro_yearly'));

COMMENT ON COLUMN public.users.subscription_status IS 'User subscription tier: free, pro_monthly, pro_yearly';
COMMENT ON COLUMN public.users.subscription_expires_at IS 'Subscription expiration date (NULL for free tier)';

ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_event_type_check
  CHECK (event_type IN ('initial_purchase', 'renewal', 'cancellation', 'expiration', 'refund', 'billing_issue', 'uncancellation', 'product_change'));
