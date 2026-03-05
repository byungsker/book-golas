ALTER TABLE public.push_templates ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.push_templates ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE public.push_templates ADD COLUMN IF NOT EXISTS body_template_en TEXT;

UPDATE public.push_templates SET name = '독서 리마인드' WHERE type = 'daily_reminder';
UPDATE public.push_templates SET name = '미독서 알림' WHERE type = 'inactive';
UPDATE public.push_templates SET name = '마감 임박' WHERE type = 'deadline';
UPDATE public.push_templates SET name = '진행률 알림' WHERE type = 'progress';
UPDATE public.push_templates SET name = '연속 독서' WHERE type = 'streak';
UPDATE public.push_templates SET name = '완독 축하' WHERE type = 'achievement';

UPDATE public.push_templates
SET title_en = 'Time to read! 📚',
    body_template_en = 'Check today''s reading goal and start reading {bookTitle}.'
WHERE type = 'daily_reminder';

UPDATE public.push_templates
SET title_en = 'Don''t forget to read! 📚',
    body_template_en = 'It''s been {days} days since you last read. How about picking it up again?'
WHERE type = 'inactive';

UPDATE public.push_templates
SET title_en = 'Deadline approaching! ⏰',
    body_template_en = 'Only {days} days left to finish "{bookTitle}".'
WHERE type = 'deadline';

UPDATE public.push_templates
SET title_en = 'Almost there! 🎯',
    body_template_en = 'You''ve read {percent}% of "{bookTitle}". Just a little more to go!'
WHERE type = 'progress';

UPDATE public.push_templates
SET title_en = 'Keep your streak going! 🔥',
    body_template_en = 'Your reading streak is {days} days! Keep it up today?'
WHERE type = 'streak';

UPDATE public.push_templates
SET title_en = 'Goal achieved! 🎉',
    body_template_en = 'Congratulations on finishing "{bookTitle}"!'
WHERE type = 'achievement';
