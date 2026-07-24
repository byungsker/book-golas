ALTER TABLE public.push_logs
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_logs_dedupe_key
  ON public.push_logs (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

INSERT INTO public.push_templates
  (type, name, title, body_template, title_en, body_template_en, is_active, priority)
VALUES
  (
    'deadline_warmup',
    '마감 준비',
    '마감까지 {daysLeft}일 남았어요 📚',
    '「{bookTitle}」 남은 {remainingPages}p, 하루 {targetPages}p면 충분해요.',
    '{daysLeft} days left 📚',
    'You have {remainingPages} pages left in "{bookTitle}" — about {targetPages} pages a day.',
    true,
    25
  ),
  (
    'deadline_soon',
    '마감 임박',
    '이제 {daysLeft}일 남았어요 ⏰',
    '「{bookTitle}」 오늘 {targetPages}p 읽으면 완독 흐름을 지킬 수 있어요.',
    '{daysLeft} days to go ⏰',
    'Read {targetPages} pages of "{bookTitle}" today to stay on track.',
    true,
    26
  ),
  (
    'deadline_tomorrow',
    '내일 마감',
    '내일 마감이에요 🔥',
    '「{bookTitle}」 남은 {remainingPages}p. 오늘 {targetPages}p부터 끊어가요.',
    'Due tomorrow 🔥',
    '"{bookTitle}" has {remainingPages} pages left. Start with {targetPages} pages today.',
    true,
    27
  ),
  (
    'deadline_today',
    '오늘 마감',
    '오늘 마감이에요 🚨',
    '「{bookTitle}」 남은 {remainingPages}p. 지금 조금만 읽어도 완독 가능성이 올라가요.',
    'Due today 🚨',
    '"{bookTitle}" is due today with {remainingPages} pages left. A short session now helps.',
    true,
    28
  ),
  (
    'deadline_overdue',
    '마감 지남',
    '목표일이 지났어요 🗓️',
    '「{bookTitle}」 남은 {remainingPages}p. 목표를 다시 잡거나 오늘 마무리해봐요.',
    'Past the target date 🗓️',
    '"{bookTitle}" has {remainingPages} pages left. Reset the target or finish a small part today.',
    true,
    29
  )
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  body_template = EXCLUDED.body_template,
  title_en = EXCLUDED.title_en,
  body_template_en = EXCLUDED.body_template_en,
  is_active = EXCLUDED.is_active,
  priority = EXCLUDED.priority;
