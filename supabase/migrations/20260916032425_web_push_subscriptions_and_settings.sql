CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type text NOT NULL DEFAULT 'web' CHECK (device_type = 'web'),
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT web_push_subscriptions_user_device_key UNIQUE (user_id, device_type)
);

CREATE TABLE IF NOT EXISTS public.web_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_enabled boolean NOT NULL DEFAULT true,
  daily_reminder_enabled boolean NOT NULL DEFAULT true,
  daily_reminder_hour integer NOT NULL DEFAULT 18 CHECK (daily_reminder_hour BETWEEN 0 AND 23),
  daily_reminder_minute integer NOT NULL DEFAULT 0 CHECK (daily_reminder_minute IN (0, 30)),
  goal_alarm_enabled boolean NOT NULL DEFAULT true,
  goal_alarm_hour integer NOT NULL DEFAULT 20 CHECK (goal_alarm_hour BETWEEN 0 AND 23),
  goal_alarm_minute integer NOT NULL DEFAULT 0 CHECK (goal_alarm_minute IN (0, 30)),
  event_nudge_enabled boolean NOT NULL DEFAULT true,
  announcements_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own web push subscription" ON public.web_push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own web push subscription" ON public.web_push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own web push subscription" ON public.web_push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own web push subscription" ON public.web_push_subscriptions;

CREATE POLICY "Users can view their own web push subscription"
  ON public.web_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own web push subscription"
  ON public.web_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND device_type = 'web');

CREATE POLICY "Users can update their own web push subscription"
  ON public.web_push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND device_type = 'web');

CREATE POLICY "Users can delete their own web push subscription"
  ON public.web_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own web notification settings" ON public.web_notification_settings;
DROP POLICY IF EXISTS "Users can insert their own web notification settings" ON public.web_notification_settings;
DROP POLICY IF EXISTS "Users can update their own web notification settings" ON public.web_notification_settings;
DROP POLICY IF EXISTS "Users can delete their own web notification settings" ON public.web_notification_settings;

CREATE POLICY "Users can view their own web notification settings"
  ON public.web_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own web notification settings"
  ON public.web_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own web notification settings"
  ON public.web_notification_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own web notification settings"
  ON public.web_notification_settings FOR DELETE
  USING (auth.uid() = user_id);
