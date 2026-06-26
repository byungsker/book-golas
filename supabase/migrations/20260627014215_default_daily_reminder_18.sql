ALTER TABLE public.fcm_tokens
  ALTER COLUMN daily_reminder_hour SET DEFAULT 18,
  ALTER COLUMN daily_reminder_minute SET DEFAULT 0;

UPDATE public.fcm_tokens
SET daily_reminder_hour = 18,
    daily_reminder_minute = 0
WHERE daily_reminder_enabled = true
  AND daily_reminder_hour = 9
  AND daily_reminder_minute = 0;
