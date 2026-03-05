ALTER TABLE public.fcm_tokens
  ADD COLUMN IF NOT EXISTS daily_reminder_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_reminder_hour INTEGER DEFAULT 9,
  ADD COLUMN IF NOT EXISTS daily_reminder_minute INTEGER DEFAULT 0;

UPDATE public.fcm_tokens
SET daily_reminder_hour = preferred_hour,
    daily_reminder_minute = CASE
      WHEN preferred_minute <= 15 THEN 0
      ELSE 30
    END;

ALTER TABLE public.fcm_tokens
  ADD COLUMN IF NOT EXISTS goal_alarm_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS goal_alarm_hour INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS goal_alarm_minute INTEGER DEFAULT 0;

ALTER TABLE public.fcm_tokens
  ADD COLUMN IF NOT EXISTS event_nudge_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.fcm_tokens
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ko';

ALTER TABLE public.fcm_tokens
  ADD CONSTRAINT daily_reminder_minute_check CHECK (daily_reminder_minute IN (0, 30)),
  ADD CONSTRAINT goal_alarm_minute_check CHECK (goal_alarm_minute IN (0, 30));

CREATE INDEX IF NOT EXISTS idx_fcm_daily_reminder_time
  ON public.fcm_tokens (daily_reminder_hour, daily_reminder_minute)
  WHERE daily_reminder_enabled = true AND notification_enabled = true;

CREATE INDEX IF NOT EXISTS idx_fcm_goal_alarm_time
  ON public.fcm_tokens (goal_alarm_hour, goal_alarm_minute)
  WHERE goal_alarm_enabled = true AND notification_enabled = true;

CREATE INDEX IF NOT EXISTS idx_fcm_event_nudge
  ON public.fcm_tokens (user_id)
  WHERE event_nudge_enabled = true AND notification_enabled = true;

ALTER TABLE public.fcm_tokens
  DROP COLUMN IF EXISTS preferred_hour,
  DROP COLUMN IF EXISTS preferred_minute;

ALTER TABLE public.push_templates
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS body_template_en TEXT;

UPDATE public.push_templates SET
  title = '오늘도 책과 함께하는 하루! 📚',
  body_template = '지금 읽고 있는 ''{bookTitle}'' 펼쳐볼까요?',
  title_en = 'Time to read! 📚',
  body_template_en = 'Ready to continue ''{bookTitle}''?'
WHERE type = 'daily_reminder';

INSERT INTO public.push_templates (type, title, body_template, title_en, body_template_en, is_active, priority)
VALUES (
  'goal_alarm',
  '오늘의 독서 목표 💪',
  '''{bookTitle}'' 오늘 {targetPages}페이지! 목표일까지 {daysLeft}일 남았어요',
  'Today''s Reading Goal 💪',
  '''{bookTitle}'' — {targetPages} pages today! {daysLeft} days left',
  true,
  15
)
ON CONFLICT (type) DO UPDATE SET
  title = EXCLUDED.title,
  body_template = EXCLUDED.body_template,
  title_en = EXCLUDED.title_en,
  body_template_en = EXCLUDED.body_template_en;

UPDATE public.push_templates SET
  title_en = 'Don''t forget to read! 📚',
  body_template_en = 'It''s been {days} days since you last read.'
WHERE type = 'inactive';

UPDATE public.push_templates SET
  title_en = 'Deadline approaching! ⏰',
  body_template_en = '{days} days left to finish "{bookTitle}".'
WHERE type = 'deadline';

UPDATE public.push_templates SET
  title_en = 'Almost there! 🎯',
  body_template_en = 'You''ve read {percent}% of "{bookTitle}".'
WHERE type = 'progress';

UPDATE public.push_templates SET
  title_en = 'Keep your streak! 🔥',
  body_template_en = 'Your reading streak is {days} days!'
WHERE type = 'streak';

UPDATE public.push_templates SET
  title_en = 'Goal achieved! 🎉',
  body_template_en = 'Congratulations on finishing "{bookTitle}"!'
WHERE type = 'achievement';
