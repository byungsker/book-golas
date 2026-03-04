INSERT INTO public.push_templates (type, title, body_template, is_active, priority)
VALUES
  ('daily_reminder', '오늘 독서 시간이에요! 📚', '오늘의 독서 목표를 확인하고 {bookTitle}을 읽어보세요.', true, 10),
  ('inactive', '독서를 잊지 마세요! 📚', '{days}일째 독서를 안 했네요. 다시 시작해볼까요?', true, 20),
  ('deadline', '목표 완료까지 얼마 안 남았어요! ⏰', '"{bookTitle}" 완독까지 {days}일 남았습니다.', true, 30),
  ('progress', '목표 달성까지 조금만 더! 🎯', '"{bookTitle}" {percent}% 완독했습니다. 조금만 더 화이팅!', true, 40),
  ('streak', '독서 연속일을 이어가세요! 🔥', '독서 연속일이 {days}일입니다! 오늘도 읽어볼까요?', true, 50),
  ('achievement', '목표를 달성했어요! 🎉', '"{bookTitle}" 완독을 축하합니다!', true, 60)
ON CONFLICT (type) DO NOTHING;
