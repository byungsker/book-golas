UPDATE public.push_templates
SET
  title = '「{bookTitle}」 이어 읽을 시간이에요 📖',
  body_template = '마지막으로 읽던 페이지부터 이어볼까요?',
  title_en = 'Time to continue “{bookTitle}” 📖',
  body_template_en = 'Ready to pick up where you left off?',
  updated_at = now()
WHERE type = 'daily_reminder';

UPDATE public.push_templates
SET
  title = '「{bookTitle}」 다시 펼쳐볼까요? 📚',
  body_template = '{days}일 만에 마지막으로 읽던 페이지부터 이어보세요.',
  title_en = 'Ready to return to “{bookTitle}”? 📚',
  body_template_en = 'It has been {days} days. Pick up where you left off.',
  updated_at = now()
WHERE type = 'inactive';

UPDATE public.push_templates
SET
  title = '「{bookTitle}」 오늘도 이어볼까요? 🔥',
  body_template = '「{bookTitle}」과 함께 {days}일째예요. 오늘도 이어 읽어볼까요?',
  title_en = 'Keep reading “{bookTitle}” 🔥',
  body_template_en = 'You are on day {days} with “{bookTitle}”. Ready to continue?',
  updated_at = now()
WHERE type = 'streak';
