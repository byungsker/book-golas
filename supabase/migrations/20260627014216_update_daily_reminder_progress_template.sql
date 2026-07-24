UPDATE public.push_templates
SET title = '오늘도 이어서 읽어볼까요? 📚',
    body_template = '「{bookTitle}」 {percent}%까지 읽었어요. 저녁 독서 흐름을 이어가봐요!',
    title_en = 'Keep reading tonight 📚',
    body_template_en = 'You are {percent}% through "{bookTitle}". Keep your reading streak going tonight!'
WHERE type = 'daily_reminder';
